# NuThoughts

NuThoughts is a **desktop-only** Obsidian plugin that runs a local Express HTTPS server inside your vault. It lets the companion NuThoughts app send thoughts to Obsidian over your local network — each thought is saved as a Markdown note with YAML frontmatter.

Because it relies on Node networking and filesystem APIs, the plugin only runs on Obsidian desktop (Windows / macOS / Linux).

## Contents

- [How it works](#how-it-works)
- [Installation](#installation)
- [Pairing the app](#pairing-the-app)
- [Usage](#usage)
- [Settings](#settings)
- [Development](#development)

## How it works

1. On first start, the plugin generates a **self-signed certificate authority** and stores `cert.pem` / `key.pem` in the plugin folder (`.obsidian/plugins/nuthoughts/`).
2. The **HTTPS server** listens on the configured port (default `8123`) and accepts `POST /thought` requests from the app.
3. Each thought is written to your **save folder** as `nuthought-<timestamp>.md` with frontmatter (creation time, optional project, and any extra fields the app sends).
4. During **pairing**, a temporary plain-HTTP server runs on `port + 1` just long enough to hand the CA certificate to the app, so the app can trust the self-signed HTTPS connection.

## Installation

Installed as a beta plugin via [BRAT](https://github.com/TfTHacker/obsidian42-brat):

1. Install and enable **Obsidian42 - BRAT** from the community plugins store.
2. Open the BRAT settings and click **Add beta plugin**.
3. Enter the repository URL: `https://github.com/sagebrush-advancements/obsidian-nuthoughts`
4. Click **Add plugin**, then enable **NuThoughts** in your community plugins list.

## Pairing the app

Pairing uses a QR code — you no longer need to copy the certificate manually.

1. Make sure your phone and computer are on the **same local network**.
2. In Obsidian, open **Settings → NuThoughts** and click **Pair** (or run the *Pair with NuThoughts app* command).
3. In the NuThoughts app, scan the QR code. The app reads the host, port, and certificate fingerprint, downloads the CA cert, and verifies the fingerprint before connecting.

If you ever regenerate the certificate (see Settings), existing pairings are invalidated and you'll need to pair again.

## Usage

The server starts automatically when Obsidian opens (unless you disable **Run on start up**). You can also control it from the command palette:

- **Start server**
- **Stop server**
- **Pair with NuThoughts app**

The status bar shows whether the server is running. Thoughts sent from the app appear as notes in your configured save folder.

## Settings

| Setting | Description |
| --- | --- |
| **Run on start up** | Start the server automatically when Obsidian opens. |
| **Pair with NuThoughts app** | Opens the pairing QR code. |
| **Port** | Port the HTTPS server listens on (default `8123`; pairing uses `port + 1`). |
| **Save folder** | Vault folder where incoming thoughts are saved. |
| **TLS folder** | Reveals the folder holding the certificate and private key. |
| **Regenerate self-signed certificate** | Issues a new certificate. Invalidates existing pairings. |
| **Enable log messages** | Logs the full request lifecycle (raw + parsed payload, validation, save) to the developer console. |

## Development

This project uses [bun](https://bun.sh).

1. Clone the repository and install bun.
2. Build the plugin:
   - `bun run build` — type-check + production bundle into `dist/`.
   - `bun run dev` — rebuild on change (watch mode).
3. Symlink the build output into a test vault's plugins folder:
   - `ln -s /path/to/obsidian-nuthoughts/dist /path/to/vault/.obsidian/plugins/nuthoughts`
4. Enable the plugin in Obsidian and reload to pick up changes.
