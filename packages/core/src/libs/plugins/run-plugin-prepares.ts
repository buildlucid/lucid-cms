import type { ResolvedLucidConfig } from "../../types/config.js";
import type { LoadedPluginCli } from "./load-plugin-clis.js";
import type { LucidPluginCliPrepareCommand } from "./types.js";

/** Runs plugins' CLI `prepare` hooks in registration order. */
const runPluginPrepares = async (props: {
	command: LucidPluginCliPrepareCommand;
	config: ResolvedLucidConfig;
	projectRoot: string;
	clis: LoadedPluginCli[];
}) => {
	for (const { cli } of props.clis) {
		await cli.hooks?.prepare?.({
			command: props.command,
			config: props.config,
			projectRoot: props.projectRoot,
		});
	}
};

export default runPluginPrepares;
