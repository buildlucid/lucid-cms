import { PLUGIN_KEY, LUCID_VERSION } from "./constants.js";
import type { LucidPlugin } from "@lucidcms/core/types";
import type { PluginOptions } from "./types.js";

const plugin: LucidPlugin<PluginOptions> = (pluginOptions) => {
	return {
		key: PLUGIN_KEY,
		lucid: LUCID_VERSION,
		hooks: {
			build: async () => {
				return {
					error: undefined,
					data: {
						artifacts: [
							{
								path: "queue.js",
								content: "",
							},
						],
					},
				};
			},
		},
		recipe: (draft) => {},
	};
};

export default plugin;
