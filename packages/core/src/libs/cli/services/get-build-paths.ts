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
		//* the input location for the SPA. this is where the package outputs its vite build
		spaInput: join(currentDir, "../../../../", constants.directories.viteBuild),
		//* the output location for the SPA
		spaOutput: join(
			cwd,
			config.build.paths.outDir,
			constants.directories.public,
			constants.directories.base,
		),
		//* the output location for the SPA index.html
		spaDistHtml: join(
			cwd,
			config.build.paths.outDir,
			constants.directories.public,
			constants.directories.base,
			"index.html",
		),
		//* the output location for the SPA plugins
		spaPluginsOutput: join(
			cwd,
			config.build.paths.outDir,
			constants.directories.public,
			constants.directories.base,
			constants.directories.plugins,
		),
		publicDist: join(
			cwd,
			config.build.paths.outDir,
			constants.directories.public,
		),
	};
};

export default getBuildPaths;
