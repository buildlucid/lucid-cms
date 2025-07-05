import { join } from "node:path";
import constants from "../../../constants/constants.js";
import { createRequire } from "node:module";
import type { Config } from "../../../types/config.js";

export type VitePaths = {
	clientMount: string;
	clientHtml: string;
	publicDist: string;
	tempDist: string;
	clientDist: string;
	clientDistHtml: string;
	buildMetadata: string;
	adminPackageJson: string;
	corePackageJson: string;
	cwdPackageJson: string;
};

/**
 * Resolve all the required paths for the Vite build
 */
const getPaths = (config: Config, cwd = process.cwd()): VitePaths => {
	const require = createRequire(import.meta.url);

	const adminPackagePath = require.resolve("@lucidcms/admin/package.json");
	const corePackagePath = require.resolve("@lucidcms/core/package.json");

	return {
		clientMount: join(
			cwd,
			config.compilerOptions?.outDir,
			constants.directories.public,
			constants.vite.mount,
		),
		clientHtml: join(
			cwd,
			config.compilerOptions?.outDir,
			constants.directories.public,
			constants.vite.html,
		),
		publicDist: join(
			cwd,
			config.compilerOptions?.outDir,
			constants.directories.public,
		),
		tempDist: join(
			cwd,
			config.compilerOptions?.outDir,
			constants.directories.temp,
		),
		clientDist: join(
			cwd,
			config.compilerOptions?.outDir,
			constants.directories.public,
			constants.vite.dist,
		),
		clientDistHtml: join(
			cwd,
			config.compilerOptions?.outDir,
			constants.directories.public,
			constants.vite.dist,
			constants.vite.html,
		),
		buildMetadata: join(
			cwd,
			config.compilerOptions?.outDir,
			constants.directories.temp,
			constants.vite.buildMetadata,
		),
		adminPackageJson: adminPackagePath,
		corePackageJson: corePackagePath,
		cwdPackageJson: join(cwd, "package.json"),
	};
};

export default getPaths;
