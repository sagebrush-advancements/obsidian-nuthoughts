import * as forge from "node-forge";

const RSA_KEY_SIZE = 4096;
const CA_COMMON_NAME = "NuThoughts";

export const calculateCertFingerprint = async (
	certPem: string
): Promise<string> => {
	// Remove PEM headers and whitespace
	const certData = certPem
		.replace(/-----BEGIN CERTIFICATE-----/, "")
		.replace(/-----END CERTIFICATE-----/, "")
		.replace(/\s/g, "");

	// Convert to binary, hash, and encode back to base64
	const certBinary = base64ToUint8Array(certData);
	const hashBuffer = await crypto.subtle.digest("SHA-256", certBinary);
	return uint8ArrayToBase64(new Uint8Array(hashBuffer));
};

//Creates a certificate authority
export const createCertificateAuthority = () => {
	// Generate a keypair
	const keys = forge.pki.rsa.generateKeyPair(RSA_KEY_SIZE);

	// Create a certificate
	const cert = forge.pki.createCertificate();

	// Set certificate fields
	cert.publicKey = keys.publicKey;
	cert.serialNumber = "01";
	cert.validity.notBefore = new Date();
	cert.validity.notAfter = new Date();
	cert.validity.notAfter.setFullYear(
		cert.validity.notBefore.getFullYear() + 10
	); // Set expiry date
	const attrs = [
		{
			name: "commonName",
			value: CA_COMMON_NAME,
		},
	];
	cert.setSubject(attrs);
	cert.setIssuer(attrs);
	cert.setExtensions([
		{
			name: "basicConstraints",
			cA: true,
		},
		{
			name: "keyUsage",
			keyCertSign: true,
			digitalSignature: true,
			nonRepudiation: true,
			keyEncipherment: true,
			dataEncipherment: true,
		},
	]);

	// Self-sign the certificate
	cert.sign(keys.privateKey, forge.md.sha256.create());

	// Convert private key and certificate to PEM format
	const privateKeyPem = forge.pki.privateKeyToPem(keys.privateKey);
	const certPem = forge.pki.certificateToPem(cert);

	return { privateKey: privateKeyPem, certificate: certPem };
};

export const issueCertificate = (
	commonName: string,
	altNames: string[],
	caPrivateKeyPem: string,
	caCertPem: string
) => {
	// Parse CA private key and certificate
	const caPrivateKey = forge.pki.privateKeyFromPem(caPrivateKeyPem);
	const caCert = forge.pki.certificateFromPem(caCertPem);

	// Generate a keypair for the new certificate
	const keys = forge.pki.rsa.generateKeyPair(RSA_KEY_SIZE);

	// Create a CSR
	const csr = forge.pki.createCertificationRequest();
	csr.publicKey = keys.publicKey;
	csr.setSubject([
		{
			name: "commonName",
			value: commonName,
		},
	]);
	csr.sign(keys.privateKey);

	// Create a certificate from the CSR
	const cert = forge.pki.createCertificate();
	cert.publicKey = csr.publicKey;
	cert.serialNumber = "02";
	cert.validity.notBefore = new Date();
	cert.validity.notAfter = new Date();
	cert.validity.notAfter.setFullYear(
		cert.validity.notBefore.getFullYear() + 1
	); // Set expiry date
	cert.setSubject(csr.subject.attributes);
	cert.setIssuer(caCert.subject.attributes);
	cert.setExtensions([
		{
			name: "keyUsage",
			digitalSignature: true,
			keyEncipherment: true,
		},
		{
			name: "extKeyUsage",
			serverAuth: true,
			clientAuth: true,
		},
		{
			name: "subjectAltName",
			altNames: [
				{
					type: 2, // DNS
					value: commonName,
				},
				...altNames.map((altName) => ({
					type: 2, // DNS
					value: altName,
				})),
			],
		},
	]);

	// Sign the certificate with the CA private key
	cert.sign(caPrivateKey, forge.md.sha256.create());

	// Convert the new certificate and its private key to PEM format
	const certPem = forge.pki.certificateToPem(cert);
	const privateKeyPem = forge.pki.privateKeyToPem(keys.privateKey);

	return { privateKey: privateKeyPem, certificate: certPem };
};

const base64ToUint8Array = (base64: string): Uint8Array => {
	const binaryString = atob(base64);
	const bytes = new Uint8Array(binaryString.length);
	for (let i = 0; i < binaryString.length; i++) {
		bytes[i] = binaryString.charCodeAt(i);
	}
	return bytes;
};

const uint8ArrayToBase64 = (bytes: Uint8Array): string => {
	let binary = "";
	for (let i = 0; i < bytes.length; i++) {
		binary += String.fromCharCode(bytes[i]);
	}
	return btoa(binary);
};
