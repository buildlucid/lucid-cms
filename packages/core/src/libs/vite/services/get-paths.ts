import path, { join } from "node:path";
import constants from "../../../constants/constants.js";

/**
 * Resolve all the required paths for the Vite build
 */
const getPaths = (cwd = process.cwd()) => {
	return {
		clientMount: join(
			cwd,
			constants.runtimeStore.dist,
			constants.vite.outputDir,
			constants.vite.mount,
		),
		clientHtml: join(
			cwd,
			constants.runtimeStore.dist,
			constants.vite.outputDir,
			constants.vite.html,
		),
		clientDirectory: join(
			cwd,
			constants.runtimeStore.dist,
			constants.vite.outputDir,
		),
		clientDist: join(
			cwd,
			constants.runtimeStore.dist,
			constants.vite.outputDir,
			constants.vite.dist,
		),
		clientDistHtml: join(
			cwd,
			constants.runtimeStore.dist,
			constants.vite.outputDir,
			constants.vite.dist,
			constants.vite.html,
		),
		buildMetadata: join(
			cwd,
			constants.runtimeStore.dist,
			constants.vite.outputDir,
			constants.vite.buildMetadata,
		),
	};
};

export default getPaths;
