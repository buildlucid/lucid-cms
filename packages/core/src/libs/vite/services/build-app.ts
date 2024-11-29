import constants from "../../../constants/constants.js";
import { join } from "node:path";
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
};

export default buildApp;
