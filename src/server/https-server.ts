import express, { NextFunction, Request, Response } from "express";
import https from "https";
import { App } from "obsidian";
import { NuThoughtsSettings } from "../types";
import { postThought } from "./routes/post-thought";

export default class HttpsServer {
	httpsServer: https.Server | null = null;

	async start(
		obsidianApp: App,
		settings: NuThoughtsSettings,
		options: {
			host: string;
			port: number;
			tlsCertificate: string;
			tlsPrivateKey: string;
		}
	) {
		const { host, port, tlsCertificate, tlsPrivateKey } = options;

		try {
			this.createHttpsServer(obsidianApp, settings, {
				tlsCertificate,
				tlsPrivateKey,
				port,
			});

			console.log(
				`NuThoughts (HTTP) listening at: https://${host}:${port}`
			);
			return true;
		} catch (err) {
			console.error(`Error starting Nuthoughts server: ${err}`);
			return false;
		}
	}

	close() {
		if (this.httpsServer) {
			this.httpsServer.close();
			this.httpsServer = null;
		}
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
			postThought(req, res, next, { obsidianApp, settings })
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
}
