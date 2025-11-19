import { join } from "node:path";
import constants from "../../../constants/constants.js";
import type { Config } from "../../../types/config.js";
import getDirName from "../../../utils/helpers/get-dir-name.js";

/**
 * Resolve all the required paths for the Vite build
 */
const getBuildPaths = (config: Config, cwd = process.cwd()) => {
	const currentDir = getDirName(import.meta.url);

	return {
		//* the input location for the admin SPA. this is where the admin package outputs its vite build
		adminInput: join(currentDir, "../../../../", constants.directories.admin),
		//* the output location for the admin SPA
		adminOutput: join(
			cwd,
			config.compilerOptions.paths.outDir,
			constants.directories.public,
			constants.directories.admin,
		),
		//* the output location for the admin SPA plugins
		adminPluginsOutput: join(
			cwd,
			config.compilerOptions.paths.outDir,
			constants.directories.public,
			constants.directories.admin,
			constants.directories.plugins,
		),
		publicDist: join(
			cwd,
			config.compilerOptions.paths.outDir,
			constants.directories.public,
		),
		clientDistHtml: join(
			cwd,
			config.compilerOptions.paths.outDir,
			constants.directories.public,
			constants.directories.admin,
			"index.html",
		),
	};
};

export default getBuildPaths;
