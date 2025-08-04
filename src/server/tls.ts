import { createHash } from "crypto";
import * as forge from "node-forge";

const RSA_KEY_SIZE = 4096;
const CA_COMMON_NAME = "NuThoughts";

export const createSelfSignedCertificate = (hostName: string) => {
	const keys = forge.pki.rsa.generateKeyPair(RSA_KEY_SIZE);
	const cert = forge.pki.createCertificate();
	cert.publicKey = keys.publicKey;
	cert.serialNumber = "01";
	cert.validity.notBefore = new Date();
	cert.validity.notAfter = new Date();
	cert.validity.notAfter.setFullYear(
		cert.validity.notBefore.getFullYear() + 1
	);

	cert.setSubject([{ name: "commonName", value: CA_COMMON_NAME }]);
	cert.setIssuer([{ name: "commonName", value: CA_COMMON_NAME }]);

	cert.setExtensions([
		{
			name: "subjectAltName",
			altNames: [
				{ type: 2, value: "localhost" },
				{ type: 2, value: hostName },
			],
		},
	]);

	// Self-sign
	cert.sign(keys.privateKey, forge.md.sha256.create());

	const pemCert = forge.pki.certificateToPem(cert);
	const pemKey = forge.pki.privateKeyToPem(keys.privateKey);

	return { privateKey: pemKey, certificate: pemCert };
};

export function calculateCertFingerprint(certPem: string): string {
	const base64 = certPem
		.replace(/-----BEGIN CERTIFICATE-----/, "")
		.replace(/-----END CERTIFICATE-----/, "")
		.replace(/\s+/g, "");

	const der = Buffer.from(base64, "base64");
	const hash = createHash("sha256").update(der).digest();

	return hash.toString("base64"); // Compact, no colon separation
}
