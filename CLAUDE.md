# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

NuThoughts is a **desktop-only Obsidian plugin** (`isDesktopOnly: true`) that runs an Express HTTPS server inside Obsidian. A companion NuThoughts mobile app POSTs "thoughts" to the server, which writes them as Markdown files into the vault. Because it relies on Node APIs (`https`, `crypto`, `os`, `fs` via the vault adapter), it cannot run on mobile.

## Commands

- **Build (production):** `bun run build` — runs `tsc -noEmit -skipLibCheck` then esbuild, bundling to `dist/main.js`.
- **Dev/watch:** `bun run dev` — esbuild in watch mode.
- **Type-check only:** `npx tsc --noEmit --skipLibCheck`
- **Lint:** `npx eslint src/` (config in `.eslintrc`).

There is no test suite or test runner configured.

The package manager is **bun** (`bun.lockb`), not npm. Build output goes to `dist/` (this is what gets symlinked into a vault's `.obsidian/plugins/nuthoughts/` for local testing — see README "Development").

## Architecture

The entry point is `src/main.ts` (`NuThoughtsPlugin`). Key flow:

1. **Plugin lifecycle** — `onload` loads settings, registers commands (`start-server`, `stop-server`, `pair`), adds the settings tab and a status-bar item, and auto-starts the server on layout-ready if `shouldRunOnStartup`.
2. **TLS bootstrap** — on server start, `main.ts` reads `cert.pem` / `key.pem` from the plugin directory. If they're missing (`ENOENT`), it calls `generateCertificateAuthority` to create and persist a fresh self-signed CA, then continues. Certs are stored **inside the vault's plugin folder**, resolved via `getCertPath`/`getCertKeyPath` in `src/server/utils.ts`.
3. **Server** — `src/server/https-server.ts` (`HttpsServer`) builds an Express app over `https.createServer`, mounts `express.json()` (with a `verify` callback that stashes the raw body on `req.rawBody` for debug logging), and routes `POST /thought` to the handler. A trailing error-handling middleware maps `string` errors to HTTP 400 and everything else to 500.
4. **Request handling** — `src/server/routes/post-thought.ts` validates the payload, then writes a file `nuthought-<createdAt>.md` into the configured `saveFolder`, with YAML frontmatter assembled from `createdAt`, optional `project`, and an optional `frontmatter` array of `{ key, value, type }` items (`type` controls coercion: checkbox→boolean, list/tags→string array, else raw text).

### Things to know

- **Two servers, two ports.** `HttpsServer` (`src/server/https-server.ts`) is the long-running server on `port` that receives thoughts. `HttpServer` (`src/server/http-server.ts`) is a *short-lived plain-HTTP* server started by the pairing modal on `port + 1`; it serves `GET /ca-cert` so the app can download the CA cert during pairing, and is closed when the modal closes. `main.ts` only instantiates `HttpsServer`; `PairingModal` owns the `HttpServer`.
- **Validation** lives in `src/server/validation/` — `validateFields` throws an `InvalidTypesError` (custom error carrying field name, received type, expected type). Handlers catch these and forward to Express's `next(err)`; the error middleware turns them into 400 responses.
- **Pairing** — the `pair` command (`src/obsidian/pairing-modal.ts`) shows host/port, the CA cert, and a SHA-256 cert fingerprint (`calculateCertFingerprint` in `src/server/tls.ts`) so the mobile app can trust the self-signed cert.
- **Settings** (`src/types.ts` → `NuThoughtsSettings`): `port` (default 8123), `shouldRunOnStartup`, `saveFolder`, `shouldDebug`. The `shouldDebug` flag ("Enable log messages" in the settings tab) gates all verbose request-lifecycle `console.log` output in the `/thought` path.

## Conventions

- Indentation is **tabs** (see `.editorconfig`).
- This repo follows RedSky/Conventional-Commits git conventions (`feat:`, `fix:`, `chore:`, etc.) — match the existing commit history.
- Bump `version` in both `package.json` and `manifest.json` together for releases (`versions.json` maps plugin version → min Obsidian version).
