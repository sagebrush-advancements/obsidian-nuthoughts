import { App, Modal } from "obsidian";
import QRCode from "qrcode";

export default class PairingModal extends Modal {
	app: App;
	hostName: string;
	httpsPort: number;
	httpPort: number;

	constructor(
		app: App,
		data: { hostName: string; httpsPort: number; httpPort: number }
	) {
		super(app);

		const { hostName, httpsPort, httpPort } = data;
		this.app = app;
		this.hostName = hostName;
		this.httpsPort = httpsPort;
		this.httpPort = httpPort;
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
					httpsPort: this.httpsPort,
					httpPort: this.httpPort,
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
	}
}
