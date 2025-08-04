import { App } from "obsidian";
import * as os from "os";
import * as path from "path";

export const getPluginPath = (app: App, absolutePath = false) => {
	const configDir = app.vault.configDir;

	const pluginPath = path.join(
		absolutePath ? getVaultPath(app) : "",
		configDir,
		"plugins",
		"nuthoughts"
	);
	return pluginPath;
};

export const getCertKeyPath = (app: App) => {
	const FILE_NAME = "key.pem";

	const pluginPath = getPluginPath(app);
	const keyPath = path.join(pluginPath, FILE_NAME);
	return keyPath;
};

export const getCertPath = (app: App) => {
	const FILE_NAME = "cert.pem";

	const pluginPath = getPluginPath(app);
	const certPath = path.join(pluginPath, FILE_NAME);
	return certPath;
};

const getVaultPath = (app: App) => {
	const vaultPath = (app.vault.adapter as any).basePath;
	return vaultPath;
};

export const getHostName = () => {
	return os.hostname().toLowerCase();
};
