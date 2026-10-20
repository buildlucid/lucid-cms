import type { ResolvedLucidConfig } from "../../../types/config.js";
import type { LucidPluginCliPrepareCommand } from "../../plugins/types.js";
import loadPluginClis from "./load-plugin-clis.js";

/** Runs plugins' CLI `prepare` hooks in registration order. */
const runPluginPrepares = async (props: {
	command: LucidPluginCliPrepareCommand;
	config: ResolvedLucidConfig;
	projectRoot: string;
}) => {
	for (const { cli } of await loadPluginClis(props.config, props.projectRoot)) {
		await cli.prepare?.(props);
	}
};

export default runPluginPrepares;
