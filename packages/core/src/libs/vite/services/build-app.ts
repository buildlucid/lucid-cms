import constants from "../../../constants/constants.js";
import { join, dirname } from "node:path";
import { copyFile } from "node:fs/promises";
import { createRequire } from "node:module";
import tailwindcss from "@tailwindcss/vite";
import { build } from "vite";
import solidPlugin from "vite-plugin-solid";
import generateClientMount from "../generators/client-mount.js";
import generateHTML from "../generators/html.js";

// TODO: improve error handling
// TODO: allow users to extend vite config within lucid.config.ts

const buildApp = async () => {
	const cwd = process.cwd();

	await Promise.all([generateClientMount(), generateHTML()]);

	await build({
		plugins: [tailwindcss(), solidPlugin()],
		root: join(cwd, constants.vite.outputDir),
		build: {
			outDir: join(cwd, constants.vite.outputDir, constants.vite.dist),
			emptyOutDir: true,
			rollupOptions: {
				input: join(cwd, constants.vite.outputDir, constants.vite.html),
			},
		},
		base: "/admin",
		// logLevel: "silent",
	});

	// TODO: tidy this up and move elsewhere
	try {
		const require = createRequire(import.meta.url);
		const faviconSource = require.resolve("@lucidcms/admin/assets/favicon.ico");

		const faviconDest = join(
			cwd,
			constants.vite.outputDir,
			constants.vite.dist,
			"assets",
			"favicon.ico",
		);

		await copyFile(faviconSource, faviconDest);
	} catch (error) {
		console.warn(
			"Failed to copy favicon.ico:",
			error instanceof Error ? error.message : error,
		);
	}
};

export default buildApp;
