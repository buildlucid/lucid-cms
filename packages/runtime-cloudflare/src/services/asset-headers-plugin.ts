import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import type { Plugin } from "vite";
import mergeAssetHeaders from "./merge-asset-headers.js";

const readExisting = async (file: string) => {
	try {
		return await readFile(file, "utf8");
	} catch (error) {
		if (error instanceof Error && "code" in error && error.code === "ENOENT") {
			return "";
		}
		throw error;
	}
};

/** Adds Worker asset caching rules last in client output's `_headers`, preserving the project's existing rules so static assets can cache without running the Worker. */
const assetHeadersPlugin = (): Plugin => ({
	name: "lucid:cloudflare-asset-headers",
	apply: "build",
	applyToEnvironment: (environment) => environment.name === "client",
	async writeBundle(options) {
		if (!options.dir) return;
		const file = path.join(options.dir, "_headers");
		await writeFile(file, mergeAssetHeaders(await readExisting(file)));
	},
});

export default assetHeadersPlugin;
