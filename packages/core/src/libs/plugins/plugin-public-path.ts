import constants from "../../constants/constants.js";

/** Returns `_plugins/<plugin key>/<file>` for `sources.public.output`, requiring a leading `/` for URLs. */
const pluginPublicPath = (pluginKey: string, file: string): string =>
	`${constants.directories.pluginPublic}/${pluginKey}/${file}`;

export default pluginPublicPath;
