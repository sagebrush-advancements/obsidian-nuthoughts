import { Notice, Plugin } from "obsidian";
import NuThoughtsSettingsTab from "./obsidian/nuthoughts-settings-tab";
import PairingModal from "./obsidian/pairing-modal";
import { issueCertificate } from "./server/certificates";
import { generateCertificateAuthority } from "./server/generate";
import NuThoughtsServer from "./server/nuthoughts-server";
import { getCACertPath, getCAKeyPath, getHostName } from "./server/utils";
import { NuThoughtsSettings } from "./types";

const DEFAULT_SETTINGS: NuThoughtsSettings = {
	shouldRunOnStartup: true,
	httpsPort: 8123,
	httpPort: 8124,
	saveFolder: "",
	shouldDebug: true,
};

export default class NuThoughtsPlugin extends Plugin {
	settings: NuThoughtsSettings;
	serverStatusBarEl: HTMLElement;
	isServerRunning: boolean;
	server: NuThoughtsServer;

	async onload() {
		this.server = new NuThoughtsServer();

		await this.loadSettings();

		this.registerCommands();

		this.addSettingTab(new NuThoughtsSettingsTab(this.app, this));

		this.serverStatusBarEl = this.addStatusBarItem();
		this.updateStatusBar(false);

		this.app.workspace.onLayoutReady(async () => {
			if (this.settings.shouldRunOnStartup) {
				this.runServer();
			}
		});
	}

	onunload() {}

	async loadSettings() {
		this.settings = Object.assign(
			{},
			DEFAULT_SETTINGS,
			await this.loadData()
		);
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}

	private registerCommands() {
		this.addCommand({
			id: "start-server",
			name: "Start server",
			callback: () => this.runServer(),
		});

		this.addCommand({
			id: "stop-server",
			name: "Stop server",
			callback: () => this.stopServer(),
		});

		this.addCommand({
			id: "pair",
			name: "Pair with NuThoughts app",
			callback: () => {
				new PairingModal(this.app, {
					hostName: getHostName(),
					httpsPort: this.settings.httpsPort,
					httpPort: this.settings.httpPort,
				}).open();
			},
		});
	}

	private async runServer() {
		if (this.isServerRunning) {
			new Notice("NuThoughts server is already running");
			return;
		}

		let caCert: string | null = null;
		let caKey: string | null = null;

		try {
			const caKeyPath = getCAKeyPath(this.app);
			const caCertPath = getCACertPath(this.app);

			caCert = await this.app.vault.adapter.read(caCertPath);
			caKey = await this.app.vault.adapter.read(caKeyPath);
		} catch (error) {
			let canContinue = false;
			if (error instanceof Error) {
				if (error.message.includes("ENOENT")) {
					console.log(
						"Certificate authority files not found. Generating new ones..."
					);
					try {
						const result = await generateCertificateAuthority(
							this.app
						);
						caCert = result.certificate;
						caKey = result.privateKey;
						canContinue = true;
					} catch (generateError) {
						console.error(
							"Failed to generate certificate authority:",
							generateError
						);
					}
				}
			}
			if (!canContinue) {
				new Notice(
					"Failed to start NuThoughts server. Failed to generate certificate authority."
				);
				return;
			}
		}

		if (!caCert || !caKey) {
			new Notice(
				"Failed to start NuThoughts server. Certificate authority files not found."
			);
			return;
		}

		const hostName = getHostName();

		//Issue a new certificate for the server
		//each time the server is started
		const issuedCert = issueCertificate(
			hostName,
			[hostName, "localhost"],
			caKey,
			caCert
		);

		const { httpsPort, httpPort } = this.settings;
		const result = await this.server.start(this.app, this.settings, {
			host: hostName,
			httpsPort,
			httpPort,
			tlsCertificate: issuedCert.certificate,
			tlsPrivateKey: issuedCert.privateKey,
		});
		if (!result) return;

		this.isServerRunning = true;
		this.updateStatusBar(true);
	}

	private stopServer() {
		if (!this.isServerRunning) {
			return;
		}

		this.server.close();
		this.updateStatusBar(false);
		this.isServerRunning = false;
		new Notice("Stopped NuThoughts server");
	}

	private updateStatusBar(isOn: boolean) {
		let text = "NuThoughts is stopped";
		if (isOn) {
			text = "NuThoughts is running";
		}

		this.serverStatusBarEl.setText(text);
	}
}
