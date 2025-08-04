import express, { Response } from "express";
import http from "http";
import { App } from "obsidian";
import { getCertPath } from "./utils";

export default class HttpServer {
	httpServer: http.Server | null = null;
	cert: string | null = null;

	async start(
		obsidianApp: App,
		options: {
			host: string;
			port: number;
		}
	) {
		const { host, port } = options;

		try {
			const certPath = getCertPath(obsidianApp);
			const cert = await obsidianApp.vault.adapter.read(certPath);
			this.cert = cert;

			this.createHttpServer(port);

			console.log(
				`NuThoughts (HTTPS) listening at: http://${host}:${port}`
			);
			return true;
		} catch (err) {
			console.error(`Error starting Nuthoughts server: ${err}`);
			return false;
		}
	}

	close() {
		if (this.httpServer) {
			this.httpServer.close();
			this.httpServer = null;
		}
	}

	private createHttpServer(port: number) {
		const httpApp = express();
		httpApp.use(express.json());

		httpApp.get("/", (_, res: Response) => {
			res.send("NuThoughts HTTP is running");
		});

		httpApp.get("/ca-cert", async (_, res) => {
			try {
				res.send({
					cert: this.cert,
				});
			} catch (err) {
				res.status(500).send("Internal Server Error");
			}
		});

		this.httpServer = httpApp.listen(port);
	}
}
