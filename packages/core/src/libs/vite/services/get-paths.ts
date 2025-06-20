import { join } from "node:path";
import constants from "../../../constants/constants.js";
import { createRequire } from "node:module";
import type { Config } from "../../../types/config.js";

/**
 * Resolve all the required paths for the Vite build
 */
const getPaths = (config: Config, cwd = process.cwd()) => {
	const require = createRequire(import.meta.url);

	const adminPackagePath = require.resolve("@lucidcms/admin/package.json");
	const corePackagePath = require.resolve("@lucidcms/core/package.json");

	return {
		clientMount: join(
			cwd,
			config.compilerOptions?.outDir,
			constants.vite.outputDir,
			constants.vite.mount,
		),
		clientHtml: join(
			cwd,
			config.compilerOptions?.outDir,
			constants.vite.outputDir,
			constants.vite.html,
		),
		clientDirectory: join(
			cwd,
			config.compilerOptions?.outDir,
			constants.vite.outputDir,
		),
		clientDist: join(
			cwd,
			config.compilerOptions?.outDir,
			constants.vite.outputDir,
			constants.vite.dist,
		),
		clientDistHtml: join(
			cwd,
			config.compilerOptions?.outDir,
			constants.vite.outputDir,
			constants.vite.dist,
			constants.vite.html,
		),
		buildMetadata: join(
			cwd,
			config.compilerOptions?.outDir,
			constants.vite.outputDir,
			constants.vite.buildMetadata,
		),
		adminPackageJson: adminPackagePath,
		corePackageJson: corePackagePath,
		cwdPackageJson: join(cwd, "package.json"),
	};
};

export default getPaths;
