import express, { NextFunction, Request, Response } from "express";
import http from "http";
import https from "https";
import { App } from "obsidian";
import { NuThoughtsSettings } from "../types";
import { handlePostThought } from "./routes/post-thought";
import { getCACertPath } from "./utils";

export default class NuThoughtsServer {
	httpsServer: https.Server | null = null;
	httpServer: http.Server | null = null;

	async start(
		obsidianApp: App,
		settings: NuThoughtsSettings,
		options: {
			host: string;
			httpsPort: number;
			httpPort: number;
			tlsCertificate: string;
			tlsPrivateKey: string;
		}
	) {
		const { host, httpsPort, httpPort, tlsCertificate, tlsPrivateKey } =
			options;

		try {
			this.createHttpsServer(obsidianApp, settings, {
				tlsCertificate,
				tlsPrivateKey,
				port: httpsPort,
			});
			this.createHttpServer(obsidianApp, httpPort);

			console.log(
				`NuThoughts HTTPS listening at: https://${host}:${httpsPort}`
			);
			console.log(
				`NuThoughts HTTP (CA cert only) listening at: http://${host}:${httpPort}`
			);
			return true;
		} catch (err) {
			console.error(`Error starting Nuthoughts server: ${err}`);
			return false;
		}
	}

	private createHttpServer(obsidianApp: App, port: number) {
		// HTTP Server (for CA cert access only)
		const httpApp = express();
		httpApp.get("/", (_, res: Response) => {
			res.send("NuThoughts HTTP is running");
		});

		httpApp.get("/ca-cert", async (_, res) => {
			try {
				const certPath = getCACertPath(obsidianApp);
				const cert = await obsidianApp.vault.adapter.read(certPath);

				res.setHeader("Content-Type", "application/x-pem-file");
				res.setHeader(
					"Content-Disposition",
					'attachment; filename="ca-cert.pem"'
				);
				res.send(cert);
			} catch (err) {
				console.error("Failed to read certificate:", err);
				res.status(500).send("Internal Server Error");
			}
		});

		this.httpServer = express().listen(port + 1);
	}

	private createHttpsServer(
		obsidianApp: App,
		settings: NuThoughtsSettings,
		options: {
			tlsCertificate: string;
			tlsPrivateKey: string;
			port: number;
		}
	) {
		const { tlsCertificate, tlsPrivateKey, port } = options;

		const httpsApp = express();
		httpsApp.use(express.json());

		httpsApp.get("/", (_, res: Response) => {
			res.send("NuThoughts HTTPS is running");
		});

		httpsApp.post("/thought", async (req, res, next) =>
			handlePostThought(req, res, next, obsidianApp, settings)
		);

		httpsApp.use(
			(
				err: unknown,
				_req: Request,
				res: Response,
				_next: NextFunction
			) => {
				// Check if it's an operational error or a programming error
				if (typeof err === "string") {
					res.status(400).json({ error: err });
				} else {
					console.error(err); // Log the error stack to your console for debugging
					res.status(500).json({
						error: "Internal server error",
					});
				}
			}
		);

		const httpsOptions: https.ServerOptions = {
			cert: tlsCertificate,
			key: tlsPrivateKey,
		};

		this.httpsServer = https
			.createServer(httpsOptions, httpsApp)
			.listen(port);
	}

	close() {
		if (this.httpsServer) {
			this.httpsServer.close();
			this.httpsServer = null;
		}
		if (this.httpServer) {
			this.httpServer.close();
			this.httpServer = null;
		}
	}
}
