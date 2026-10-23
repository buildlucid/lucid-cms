import type { ResolvedLucidConfig } from "../../types/config.js";
import { LucidError } from "../../utils/errors/index.js";
import importDefaultExport from "../../utils/helpers/import-default-export.js";
import type { LucidPluginCli, LucidPluginCliFactory } from "./types.js";

/** A plugin's CLI module, created with the plugin's options. */
export type LoadedPluginCli = { key: string; cli: LucidPluginCli };

const isPluginCliFactory = (
	value: unknown,
): value is LucidPluginCliFactory<unknown> => typeof value === "function";

/** Imports each plugin's CLI module and calls its factory with the plugin's options. */
const loadPluginClis = (
	config: ResolvedLucidConfig,
	projectRoot: string,
): Promise<LoadedPluginCli[]> =>
	Promise.all(
		config.plugins.flatMap((plugin) => {
			const cli = plugin.cli;
			if (!cli) return [];

			return (async () => {
				const factory = await importDefaultExport(cli.module, {
					projectRoot,
					label: `The "${plugin.key}" plugin's CLI module`,
				});
				if (!isPluginCliFactory(factory)) {
					throw new LucidError({
						scope: plugin.key,
						message: `"${cli.module}" must default export the "${plugin.key}" plugin's CLI factory.`,
					});
				}

				return { key: plugin.key, cli: factory(cli.options) };
			})();
		}),
	);

export default loadPluginClis;
