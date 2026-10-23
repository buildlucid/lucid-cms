import type { Plugin } from "vite";
import constants from "../../constants/constants.js";
import { createTranslator } from "../i18n/index.js";
import checkAllPluginsCompatibility from "../plugins/check-all-plugins-compatibility.js";
import type { LoadedPluginCli } from "../plugins/load-plugin-clis.js";
import runPluginPrepares from "../plugins/run-plugin-prepares.js";
import type { LucidPluginCliPrepareCommand } from "../plugins/types.js";
import generateProjectTypes from "./generate-project-types.js";
import type { LucidPluginProps } from "./types.js";

/** Generates types, runs plugin CLI `prepare` hooks and checks compatibility before environments start, unless `prepare` is disabled or the server only runs command tasks. */
const lucidPreparePlugin = (
	props: LucidPluginProps & { clis: LoadedPluginCli[] },
): Plugin => {
	const { project } = props;
	let command: LucidPluginCliPrepareCommand = "dev";

	return {
		name: "lucid:prepare",
		config(_, env) {
			command = env.command === "build" ? "build" : "dev";
		},
		async configResolved(config) {
			if (
				config.plugins.some(
					(plugin) => plugin.name === constants.dev.taskServerPlugin,
				)
			) {
				return;
			}

			await checkAllPluginsCompatibility({
				runtimeContext: {
					...project.runtimeContext,
					host: props.host ?? "lucid",
				},
				config: project.config,
				translate: createTranslator({
					store: project.translationStore,
					locale: "en",
				}),
			});
			await Promise.all([
				generateProjectTypes(project),
				runPluginPrepares({
					command,
					config: project.config,
					projectRoot: project.projectRoot,
					clis: props.clis,
				}),
			]);
		},
	};
};

export default lucidPreparePlugin;
