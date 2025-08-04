import { App } from "obsidian";
import { createSelfSignedCertificate } from "./tls";
import { getCertKeyPath, getCertPath, getHostName } from "./utils";

export const generateCertificateAuthority = async (app: App) => {
	const hostName = getHostName();
	const result = createSelfSignedCertificate(hostName);

	const caCertPath = getCertPath(app);
	const privateKeyPath = getCertKeyPath(app);

	await app.vault.adapter.write(caCertPath, result.certificate);
	await app.vault.adapter.write(privateKeyPath, result.privateKey);
	return result;
};
