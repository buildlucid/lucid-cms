import path from "node:path";
import type { ResolvedLucidConfig } from "../../../types/config.js";
import type { ResourceFile } from "../../resources/types.js";
import loadPluginClis from "./load-plugin-clis.js";

/**
 * Runs plugins' CLI builds in registration order and returns their data and module paths, keyed by plugin key.
 */
const runPluginBuilds = async (props: {
	config: ResolvedLucidConfig;
	projectRoot: string;
	runtime: string;
	publicFiles: ResourceFile[];
}) => {
	const outDir = path.resolve(props.config.build.outDir);
	const data: Record<string, unknown> = {};
	const modules: Record<string, string> = {};

	for (const { key, cli } of await loadPluginClis(
		props.config,
		props.projectRoot,
	)) {
		const result = await cli.hooks?.build?.({
			config: props.config,
			projectRoot: props.projectRoot,
			runtime: props.runtime,
			publicFiles: props.publicFiles,
			outDir,
		});
		if (result?.data !== undefined) data[key] = result.data;
		if (result?.module !== undefined) {
			const relative = path.relative(outDir, result.module);
			if (!path.isAbsolute(result.module) || relative.startsWith("..")) {
				throw new Error(
					`Plugin "${key}" returned a build module outside the build output: ${result.module}`,
				);
			}
			modules[key] = result.module;
		}
	}

	return { data, modules };
};

export default runPluginBuilds;
