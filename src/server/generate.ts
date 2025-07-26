import { App } from "obsidian";
import { createCertificateAuthority } from "./certificates";
import { getCACertPath, getCAKeyPath } from "./utils";

export const generateCertificateAuthority = async (app: App) => {
	const result = createCertificateAuthority();

	const caCertPath = getCACertPath(app);
	const privateKeyPath = getCAKeyPath(app);

	await app.vault.adapter.write(caCertPath, result.certificate);
	await app.vault.adapter.write(privateKeyPath, result.privateKey);
	return result;
};
