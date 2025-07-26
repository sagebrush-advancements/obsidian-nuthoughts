import babel from "@babel/core";
import builtins from "builtin-modules";
import Bun from "bun";
import fs, { watch } from "fs";
import { throttle } from "lodash";
import path from "path";

const prod = process.argv[2] === "production";
const MAIN_OUTPUT_PATH = path.join(__dirname, "dist", "main.js");

if (!prod) {
	console.log("Development mode: watching src/ for changes...");
}

const throttledBuild = throttle(build, 100);
const watcher = watch("src", { recursive: true }, () => {
	throttledBuild();
});

process.on("SIGINT", () => {
	// close watcher when Ctrl-C is pressed
	console.log("Closing watcher...");
	watcher.close();

	process.exit(0);
});

await build();

async function build() {
	console.log("Building...");
	console.time("Done");
	const MAIN_ENTRYPOINT = path.join(__dirname, "src", "main.ts");

	await _buildBun(MAIN_ENTRYPOINT);
	_convertToCommonJS(MAIN_OUTPUT_PATH);
	await _copyManifestFile();
	await _replaceImportMeta();

	console.timeEnd("Done");
}

async function _buildBun(entrypoint) {
	return Bun.build({
		entrypoints: [entrypoint],
		outdir: path.join(__dirname, "dist"),
		external: [
			"obsidian",
			"electron",
			"@codemirror/autocomplete",
			"@codemirror/collab",
			"@codemirror/commands",
			"@codemirror/language",
			"@codemirror/lint",
			"@codemirror/search",
			"@codemirror/state",
			"@codemirror/view",
			"@lezer/common",
			"@lezer/highlight",
			"@lezer/lr",
			...builtins,
		],
		minify: prod,
		target: "bun",
	});
}

function _copyManifestFile() {
	fs.copyFileSync(
		path.join(__dirname, "manifest.json"),
		path.join(__dirname, "dist", "manifest.json")
	);
}

function _convertToCommonJS(inputPath) {
	const transformed = babel.transformFileSync(inputPath, {
		presets: ["@babel/preset-env"],
	});
	fs.writeFileSync(inputPath, transformed.code);
}

async function _replaceImportMeta() {
	try {
		// Read the file
		const data = await fs.promises.readFile(MAIN_OUTPUT_PATH, "utf8");
		const updatedData = data.replace(/import\.meta\.require/g, "require");

		// Write the updated content back to the file
		await fs.promises.writeFile(MAIN_OUTPUT_PATH, updatedData, "utf8");
	} catch (err) {
		console.error("An error occurred:", err);
	}
}
