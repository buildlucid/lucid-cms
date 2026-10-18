import { readFile } from "node:fs/promises";
import path from "node:path";
import constants from "../../../constants/constants.js";
import type { ResolvedLucidConfig } from "../../../types/config.js";
import isPlainObject from "../../../utils/helpers/is-plain-object.js";
import { pathExists } from "../../../utils/helpers/resolve-source-path.js";

/** Reads the plugin data written by the last `lucidcms build`, or none when there is no build. */
const readPluginData = async (
	config: ResolvedLucidConfig,
): Promise<Record<string, unknown>> => {
	const file = path.resolve(config.build.outDir, constants.plugins.dataOutput);
	if (!(await pathExists(file))) return {};
	const data: unknown = JSON.parse(await readFile(file, "utf8"));
	return isPlainObject(data) ? data : {};
};

export default readPluginData;
