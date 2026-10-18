import { pathToFileURL } from "node:url";
import type { ResolvedLucidConfig } from "../../../types/config.js";
import { resolveSourcePath } from "../../../utils/helpers/resolve-source-path.js";
import type { LucidPluginCliFactory } from "../../plugins/types.js";

/** Imports each plugin's CLI module and calls its factory with the plugin's options. */
const loadPluginClis = (config: ResolvedLucidConfig, projectRoot: string) =>
	Promise.all(
		config.plugins.flatMap((plugin) => {
			const cli = plugin.cli;
			if (!cli) return [];

			return (async () => {
				const modulePath = await resolveSourcePath(cli.module, {
					projectRoot,
					label: `The "${plugin.key}" plugin's CLI module`,
				});
				const imported: { default: LucidPluginCliFactory<unknown> } =
					await import(pathToFileURL(modulePath).href);
				return { key: plugin.key, cli: imported.default(cli.options) };
			})();
		}),
	);

export default loadPluginClis;
