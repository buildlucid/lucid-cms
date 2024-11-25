import C from "../../../constants/constants.js";
import { join } from "node:path";
import { build } from "vite";
import solidPlugin from "vite-plugin-solid";
import generateClientMount from "../generators/client-mount.js";
import generateHTML from "../generators/html.js";

// TODO: improve error handling

const buildApp = async () => {
	const cwd = process.cwd();

	await Promise.all([generateClientMount(), generateHTML()]);

	await build({
		plugins: [solidPlugin()],
		root: join(cwd, C.vite.outputDir),
		build: {
			outDir: join(cwd, C.vite.outputDir, C.vite.dist),
			emptyOutDir: true,
			rollupOptions: {
				input: join(cwd, C.vite.outputDir, C.vite.html),
			},
		},
	});
};

export default buildApp;
