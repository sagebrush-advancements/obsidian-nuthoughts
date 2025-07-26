import { App, Notice, PluginSettingTab, Setting } from "obsidian";

import { exec } from "child_process";

import { generateCertificateAuthority } from "src/server/generate";
import NuThoughtsPlugin from "../main";
import { getHostName, getPluginPath } from "../server/utils";
import PairingModal from "./pairing-modal";

export default class NuThoughtsSettingsTab extends PluginSettingTab {
	plugin: NuThoughtsPlugin;

	constructor(app: App, plugin: NuThoughtsPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const { containerEl } = this;

		containerEl.empty();

		new Setting(containerEl).setHeading().setName("General");

		new Setting(containerEl)
			.setName("Run on start up")
			.addToggle((toggle) =>
				toggle
					.setValue(this.plugin.settings.shouldRunOnStartup)
					.onChange(async (value) => {
						this.plugin.settings.shouldRunOnStartup = value;
						await this.plugin.saveSettings();
					})
			);

		new Setting(containerEl)
			.setName("Pair with NuThoughts app")
			.setDesc(
				"Opens a QR code that can be scanned by the NuThoughts app"
			)
			.addButton((btn) =>
				btn.setButtonText("Pair").onClick(async () => {
					new PairingModal(this.app, {
						hostName: getHostName(),
						httpsPort: this.plugin.settings.httpsPort,
						httpPort: this.plugin.settings.httpPort,
					}).open();
				})
			);

		new Setting(containerEl).setHeading().setName("Server");

		new Setting(containerEl)
			.setName("HTTPS port")
			.setDesc("The port to run the server on. Defaults to 8123")
			.addText((text) =>
				text
					.setValue(this.plugin.settings.httpsPort.toString())
					.onChange(async (value) => {
						this.plugin.settings.httpsPort = Number(value);
						await this.plugin.saveSettings();
					})
			);

		new Setting(containerEl)
			.setName("HTTP port")
			.setDesc("The port to run the CA cert server on. Defaults to 8124")
			.addText((text) =>
				text
					.setValue(this.plugin.settings.httpPort.toString())
					.onChange(async (value) => {
						this.plugin.settings.httpPort = Number(value);
						await this.plugin.saveSettings();
					})
			);

		new Setting(containerEl).setHeading().setName("Data");

		new Setting(containerEl)
			.setName("Save folder")
			.setDesc("The folder to save thoughts to")
			.addText((text) =>
				text
					.setValue(this.plugin.settings.saveFolder)
					.onChange(async (value) => {
						this.plugin.settings.saveFolder = value;
						await this.plugin.saveSettings();
					})
			);

		new Setting(containerEl).setHeading().setName("Security");

		new Setting(containerEl)
			.setName("TLS folder")
			.setDesc(
				"Opens the folder containing TLS certificates and private keys"
			)
			.addButton((btn) =>
				btn.setButtonText("Open").onClick(() => {
					const path = getPluginPath(this.app, true);
					exec(`open -R ${path}`, (error, _stdout, stderr) => {
						if (error) {
							console.error(`Error: ${error.message}`);
							return;
						}
						if (stderr) {
							console.error(`Stderr: ${stderr}`);
							return;
						}
					});
				})
			);

		new Setting(containerEl)
			.setName("Regenerate CA certificate")
			.setDesc(
				"Regenerates a new certificate authority certificate and private key"
			)
			.addButton((btn) =>
				btn.setButtonText("Regenerate").onClick(async () => {
					try {
						await generateCertificateAuthority(this.app);
						const pluginPath = getPluginPath(this.app, true);
						new Notice(
							`Generated certificate authority at: ${pluginPath}`
						);
					} catch (err) {
						console.error(err);
					}
				})
			);

		new Setting(containerEl).setHeading().setName("Debug");

		new Setting(containerEl)
			.setName("Enable log messages")
			.addToggle((toggle) =>
				toggle
					.setValue(this.plugin.settings.shouldDebug)
					.onChange(async (value) => {
						this.plugin.settings.shouldDebug = value;
						await this.plugin.saveSettings();
					})
			);
	}
}
