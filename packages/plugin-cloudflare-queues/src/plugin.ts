import { PLUGIN_KEY, LUCID_VERSION } from "./constants.js";
import type { LucidPlugin } from "@lucidcms/core/types";
import type { PluginOptions } from "./types.js";

const plugin: LucidPlugin<PluginOptions> = (pluginOptions) => {
	return {
		key: PLUGIN_KEY,
		lucid: LUCID_VERSION,
		hooks: {
			build: async (props) => {
				const queueConsumerEntry = /* ts */ `
import config from "./${props.paths.outputRelativeConfigPath}";
import { processConfig } from "@lucidcms/core/helpers";

export default {
	async queue(batch, env) {
		const resolved = await processConfig(
			config(env),
		);

		for (const message of batch.messages) {
			const { jobId, event, payload } = message.body;
			
			console.log('Processing job:', {
				jobId,
				event,
				payload,
			});

			// TODO: Execute job handler and update DB
			
			message.ack();
		}
	}
};
`;

				return {
					error: undefined,
					data: {
						artifacts: [
							{
								type: "compile",
								input: {
									path: "temp-queue-consumer.ts",
									content: queueConsumerEntry,
								},
								output: {
									path: "queue-consumer",
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
