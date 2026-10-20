import path from "node:path";
import constants from "../../constants/constants.js";

/** Returns the project's `.lucid/plugins/<plugin key>` path for isolated plugin files such as caches and databases; callers must create it before writing. */
const pluginDirectory = (pluginKey: string, projectRoot = process.cwd()) =>
	path.join(
		projectRoot,
		constants.directories.lucid,
		constants.directories.plugins,
		pluginKey,
	);

export default pluginDirectory;
