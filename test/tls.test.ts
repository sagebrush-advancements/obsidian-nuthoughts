import { describe, it, expect } from "bun:test";
import * as forge from "node-forge";

import {
	createSelfSignedCertificate,
	calculateCertFingerprint,
} from "../src/server/tls";

// A fixed self-signed certificate and its known SHA-256 fingerprint
// (base64 of the DER bytes). Used to pin calculateCertFingerprint's output.
const FIXTURE_CERT = `-----BEGIN CERTIFICATE-----
MIIDEzCCAfugAwIBAgIUe7A1hGUwQp0D8t8ZcGEeZjm1JrIwDQYJKoZIhvcNAQEL
BQAwGTEXMBUGA1UEAwwOTnVUaG91Z2h0c1Rlc3QwHhcNMjYwNjIyMDMxMjAxWhcN
MzYwNjE5MDMxMjAxWjAZMRcwFQYDVQQDDA5OdVRob3VnaHRzVGVzdDCCASIwDQYJ
KoZIhvcNAQEBBQADggEPADCCAQoCggEBAPZ6t6HIdIlkeu3/wsoC+IpvBPAE/vRE
u61OweJe7Z2kh5jAHZ1Om/zLLv9yqaMC9FNLRDUaXLRTfV3YW/bwJ2ju3QfzyGZf
pdMj2YOZFRzO48hvurbCaclpPzQMJexwDktwTsZovTWm0y+74We6xpTjyuVM/VTq
A48S6xtvtZLytfiTT0Txz4QLPaleaxNZ6qA/GqK4xbUH6MATIM/Sd9AKHLhksPzn
HaqSqFAhRGJUX3My9vexc4kqYCd3ra3kUghD+65FKUPoqjnUOrm9soY4FGb59ijK
ubWLVm8XejXQpIwxO28HnBwgfpZap4rm3MyLeXTyaw0eCgN/Oz8ig38CAwEAAaNT
MFEwHQYDVR0OBBYEFJIbtrSKuqz2VZDJ4zQ+RY+Qu9HpMB8GA1UdIwQYMBaAFJIb
trSKuqz2VZDJ4zQ+RY+Qu9HpMA8GA1UdEwEB/wQFMAMBAf8wDQYJKoZIhvcNAQEL
BQADggEBAGQADrHiaB9qYBXuYSj7G9Ay0kabwbN8tQBLlZ8EhpuHYhS3W33NPMd5
TK7Kuj2bu7VSO0ci7Jc13xedHY3Bour0JS5Nlu1j136DkQxMBhWoe21B8IcTaAVs
OVhMPjjSfWF0eFFcp+wrM5AvIvZehIxcKTz4B/emG/V/JNA5IPQVbeDMNFWVBwWJ
xTNsO54uzJjnoh/sR6sBWadkX7I2Er0qsdMdiH9uROGp3/3HKXjXCSw21ZXqIFRD
BLs5IFs5/toWjSdDAaE7u85OVF+ncH4/zfZsOEIqAhNd56cx/eab9ohqI5GlNElI
Ov2IbogNKtXGjec7vyRZXuvem4wm8Ag=
-----END CERTIFICATE-----`;

const FIXTURE_FINGERPRINT = "0ArUBPOmWLyztPmg0okb/hXRF9vO7NgLRoskvhsh7ds=";

describe("calculateCertFingerprint", () => {
	it("returns the known base64 SHA-256 fingerprint for a fixed cert", () => {
		expect(calculateCertFingerprint(FIXTURE_CERT)).toBe(FIXTURE_FINGERPRINT);
	});

	it("ignores surrounding whitespace and header formatting", () => {
		const padded = `\n\n  ${FIXTURE_CERT}  \n\n`;
		expect(calculateCertFingerprint(padded)).toBe(FIXTURE_FINGERPRINT);
	});
});

describe("createSelfSignedCertificate", () => {
	it(
		"produces PEM key/cert with localhost and the host in the SANs",
		() => {
			const { privateKey, certificate } =
				createSelfSignedCertificate("myhost");

			expect(certificate).toContain("-----BEGIN CERTIFICATE-----");
			expect(privateKey).toContain("-----BEGIN RSA PRIVATE KEY-----");

			const cert = forge.pki.certificateFromPem(certificate);
			const altNames = (
				cert.getExtension("subjectAltName") as
					| { altNames: { value: string }[] }
					| undefined
			)?.altNames.map((n) => n.value);

			expect(altNames).toContain("localhost");
			expect(altNames).toContain("myhost");
		},
		30000
	);
});
