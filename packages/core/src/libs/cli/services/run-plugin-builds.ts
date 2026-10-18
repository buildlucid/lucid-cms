import path from "node:path";
import type { ResolvedLucidConfig } from "../../../types/config.js";
import loadPluginClis from "./load-plugin-clis.js";

/** Runs plugins' CLI builds in registration order and returns their data, keyed by plugin key. */
const runPluginBuilds = async (props: {
	config: ResolvedLucidConfig;
	projectRoot: string;
}) => {
	const outDir = path.resolve(props.config.build.outDir);
	const data: Record<string, unknown> = {};

	for (const { key, cli } of await loadPluginClis(
		props.config,
		props.projectRoot,
	)) {
		const result = await cli.build?.({
			config: props.config,
			projectRoot: props.projectRoot,
			outDir,
		});
		if (result?.data !== undefined) data[key] = result.data;
	}

	return data;
};

export default runPluginBuilds;
