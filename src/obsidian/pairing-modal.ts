import { App, Modal } from "obsidian";
import QRCode from "qrcode";
import HttpServer from "src/server/http-server";

export default class PairingModal extends Modal {
	app: App;
	hostName: string;
	port: number;
	cert: string;
	certFingerprint: string;
	httpServer: HttpServer;

	constructor(
		app: App,
		data: {
			hostName: string;
			port: number;
			cert: string;
			certFingerprint: string;
		}
	) {
		super(app);

		const { hostName, port, cert, certFingerprint } = data;
		this.app = app;
		this.hostName = hostName;
		this.port = port;
		this.cert = cert;
		this.certFingerprint = certFingerprint;
		this.httpServer = new HttpServer();
	}

	onOpen(): void {
		const { contentEl } = this;
		const parentEl = contentEl.parentElement;
		if (!parentEl) return;

		parentEl.style.maxWidth = "375px";
		contentEl.empty();

		const title = contentEl.createEl("h2", {
			text: "Pair with NuThoughts App",
		});
		title.style.textAlign = "center";
		title.style.marginBottom = "20px";

		const description = contentEl.createEl("p", {
			text: "Scan this QR code with the NuThoughts app to pair your device.",
		});
		description.style.textAlign = "center";
		description.style.marginBottom = "20px";

		const qrContainer = contentEl.createEl("div");
		qrContainer.style.display = "flex";
		qrContainer.style.justifyContent = "center";
		qrContainer.style.marginBottom = "20px";

		try {
			const canvas = qrContainer.createEl("canvas");
			QRCode.toCanvas(
				canvas,
				JSON.stringify({
					hostName: this.hostName,
					port: this.port,
					certPort: this.port + 1,
					certFingerprint: this.certFingerprint,
				}),
				{
					scale: 8,
					margin: 4,
					width: 180,
				},
				(error: Error) => {
					if (error) {
						console.error("Error generating QR code:", error);
						qrContainer.createEl("p", {
							text: "Error generating QR code. Please try again.",
						});
					}
				}
			);

			this.httpServer.start(this.app, {
				host: this.hostName,
				port: this.port + 1,
			});
		} catch (error) {
			console.error("QR code library not available:", error);
			qrContainer.createEl("p", {
				text: "QR code generation not available.",
			});
		}
	}

	onClose(): void {
		const { contentEl } = this;
		contentEl.empty();
		this.httpServer.close();
	}
}
