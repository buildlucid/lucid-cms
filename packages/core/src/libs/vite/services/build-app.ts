import constants from "../../../constants/constants.js";
import { join } from "node:path";
import { build } from "vite";
import solidPlugin from "vite-plugin-solid";
import generateClientMount from "../generators/client-mount.js";
import generateHTML from "../generators/html.js";
import resolvePackagePath from "../../../utils/helpers/resolve-package-path.js";

// TODO: improve error handling
// TODO: allow users to extend vite config within lucid.config.ts

const buildApp = async () => {
	const cwd = process.cwd();

	await Promise.all([generateClientMount(), generateHTML()]);

	await build({
		plugins: [solidPlugin()],
		root: join(cwd, constants.vite.outputDir),
		build: {
			outDir: join(cwd, constants.vite.outputDir, constants.vite.dist),
			emptyOutDir: true,
			rollupOptions: {
				input: join(cwd, constants.vite.outputDir, constants.vite.html),
			},
		},
		resolve: {
			alias: {
				"@lucidcms/admin": resolvePackagePath("@lucidcms/admin"),
			},
		},
		// logLevel: 'silent',
	});
};

export default buildApp;
