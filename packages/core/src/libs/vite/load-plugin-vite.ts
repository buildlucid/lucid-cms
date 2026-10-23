import type { LoadedPluginCli } from "../plugins/load-plugin-clis.js";
import type { LucidPluginVite } from "../plugins/types.js";
import type { LucidViteProject } from "./types.js";

/** A plugin's addition to the project's Vite app. */
export type PluginVite = LucidPluginVite & { key: string };

/** Calls plugins' CLI `vite` hooks in registration order, for `lucid()` to add their Vite plugins and server modules. */
const loadPluginVite = async (props: {
	project: LucidViteProject;
	clis: LoadedPluginCli[];
}): Promise<PluginVite[]> => {
	const additions: PluginVite[] = [];

	for (const { key, cli } of props.clis) {
		const vite = await cli.hooks?.vite?.({
			config: props.project.config,
			projectRoot: props.project.projectRoot,
			runtime: props.project.adapter.key,
		});
		if (vite) additions.push({ key, ...vite });
	}

	return additions;
};

export default loadPluginVite;
