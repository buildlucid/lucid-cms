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
								type: "compile",
								input: {
									path: "temp-queue-adapter.ts",
									content: "console.log('queue adapter');",
								},
								output: {
									path: "queue-adapter",
								},
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
