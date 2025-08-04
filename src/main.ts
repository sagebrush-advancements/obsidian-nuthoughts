import { Notice, Plugin } from "obsidian";
import NuThoughtsSettingsTab from "./obsidian/nuthoughts-settings-tab";
import PairingModal from "./obsidian/pairing-modal";
import { generateCertificateAuthority } from "./server/generate";
import HttpsServer from "./server/https-server";
import { calculateCertFingerprint } from "./server/tls";
import { getCertKeyPath, getCertPath, getHostName } from "./server/utils";
import { NuThoughtsSettings } from "./types";

const DEFAULT_SETTINGS: NuThoughtsSettings = {
	shouldRunOnStartup: true,
	port: 8123,
	saveFolder: "",
	shouldDebug: true,
};

export default class NuThoughtsPlugin extends Plugin {
	settings: NuThoughtsSettings;
	serverStatusBarEl: HTMLElement;
	isServerRunning: boolean;
	server: HttpsServer;

	async onload() {
		this.server = new HttpsServer();

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
			callback: async () => {
				const certPath = getCertPath(this.app);
				const cert = await this.app.vault.adapter.read(certPath);
				const certFingerprint = await calculateCertFingerprint(cert);

				const hostName = getHostName();

				const { port } = this.settings;

				new PairingModal(this.app, {
					host: hostName,
					port,
					cert,
					certFingerprint,
				}).open();
			},
		});
	}

	private async runServer() {
		if (this.isServerRunning) {
			new Notice("NuThoughts server is already running");
			return;
		}

		let cert: string | null = null;
		let certKey: string | null = null;

		try {
			const certKeyPath = getCertKeyPath(this.app);
			const certPath = getCertPath(this.app);

			cert = await this.app.vault.adapter.read(certPath);
			certKey = await this.app.vault.adapter.read(certKeyPath);
		} catch (error) {
			let canContinue = false;
			if (error instanceof Error) {
				if (error.message.includes("ENOENT")) {
					console.log(
						"Self-signed certificate not found. Generating new one..."
					);
					try {
						const result = await generateCertificateAuthority(
							this.app
						);
						cert = result.certificate;
						certKey = result.privateKey;
						canContinue = true;
					} catch (generateError) {
						console.error(
							"Failed to generate self-signed certificate:",
							generateError
						);
					}
				}
			}
			if (!canContinue) {
				new Notice(
					"Failed to start NuThoughts server. Failed to generate self-signed certificate."
				);
				return;
			}
		}

		if (!cert || !certKey) {
			new Notice(
				"Failed to start NuThoughts server. Self-signed certificate not found."
			);
			return;
		}

		const { port } = this.settings;

		const hostName = getHostName();
		const result = await this.server.start(this.app, this.settings, {
			host: hostName,
			port,
			tlsCertificate: cert,
			tlsPrivateKey: certKey,
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
