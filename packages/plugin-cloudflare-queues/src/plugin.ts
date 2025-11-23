import { PLUGIN_KEY, LUCID_VERSION } from "./constants.js";
import type { LucidPlugin } from "@lucidcms/core/types";
import type { PluginOptions } from "./types.js";
import cloudflareQueuesAdapter from "./adapter.js";
import { MAX_ATTEMPTS } from "./constants.js";

const plugin: LucidPlugin<PluginOptions> = (pluginOptions) => {
	return {
		key: PLUGIN_KEY,
		lucid: LUCID_VERSION,
		hooks: {
			build: async (props) => {
				const queueImportsContent = /* ts */ `import config from "./${props.paths.outputRelativeConfigPath}";
import { processConfig } from "@lucidcms/core/helpers";
import { passthroughQueueAdapter, logScope, executeSingleJob } from "@lucidcms/core/queue-adapter";
import { getKVAdapter } from "@lucidcms/core/kv-adapter";
import { logger } from "@lucidcms/core";
`;

				const queueExportContent = /* ts */ `async queue(batch, env) {
const resolved = await processConfig(config(env));
const kvInstance = await getKVAdapter(resolved);

const internalQueueAdapter = passthroughQueueAdapter({
    bypassImmediateExecution: true,
});

for (const message of batch.messages) {
    try {
        const { jobId, event, payload } = message.body;

        logger.debug({
            message: "Processing Cloudflare queue message",
            scope: logScope,
            data: { jobId, event },
        });

        const result = await executeSingleJob(
            {
                config: resolved,
                db: resolved.db.client,
                env: env || null,
                queue: internalQueueAdapter,
                kv: kvInstance,
            },
            {
                jobId,
                event,
                payload,
                attempts: message.attempts,
                maxAttempts: ${pluginOptions.maxAttempts ?? MAX_ATTEMPTS},
                setNextRetryAt: false,
            },
        );

        if (result.success) {
            logger.debug({
                message: "Job completed successfully",
                scope: logScope,
                data: { jobId, event },
            });
            message.ack();
        } else if (result.shouldRetry) {
            logger.debug({
                message: "Job failed, will retry",
                scope: logScope,
                data: { jobId, event, message: result.message },
            });
            message.retry();
        } else {
            logger.error({
                message: "Job failed permanently",
                scope: logScope,
                data: { jobId, event, message: result.message },
            });
            message.ack();
        }
    } catch (error) {
        logger.error({
            message: "Error processing queue message",
            scope: logScope,
            data: {
                error: error instanceof Error ? error.message : String(error),
                stack: error instanceof Error ? error.stack : undefined,
            },
        });
        message.retry();
    }
}
}`;

				if (pluginOptions.consumer === "separate") {
					return {
						error: undefined,
						data: {
							artifacts: [
								{
									type: "compile",
									input: {
										path: "temp-queue-consumer.ts",
										content: /* ts */ `${queueImportsContent}
    
    export default {
        ${queueExportContent}
    };`,
									},
									output: {
										path: "queue-consumer",
									},
								},
							],
						},
					};
				}

				return {
					error: undefined,
					data: {
						artifacts: [
							{
								type: "worker-export",
								custom: {
									import: queueImportsContent,
									export: queueExportContent,
								},
							},
						],
					},
				};
			},
		},
		recipe: (draft) => {
			if (draft.queue?.adapter) {
				draft.queue.adapter = cloudflareQueuesAdapter(pluginOptions);
			} else {
				draft.queue = {
					adapter: cloudflareQueuesAdapter(pluginOptions),
				};
			}
		},
	};
};

export default plugin;
