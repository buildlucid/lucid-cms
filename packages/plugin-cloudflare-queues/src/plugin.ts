import { PLUGIN_KEY, LUCID_VERSION } from "./constants.js";
import { LucidError } from "@lucidcms/core";
import type {
	LucidPlugin,
	RuntimeBuildArtifactCustom,
} from "@lucidcms/core/types";
import type { PluginOptions } from "./types.js";
import cloudflareQueuesAdapter from "./adapter.js";
import {
	MAX_RETRIES,
	SUPPORTED_RUNTIME_ADAPTER_KEY,
	BASE_DELAY_SECONDS,
} from "./constants.js";
import type {
	CloudflareWorkerEntryArtifact,
	CloudflareWorkerExportArtifact,
	CloudflareWorkerImport,
	CloudflareWorkerExport,
} from "@lucidcms/cloudflare-adapter/types";

const plugin: LucidPlugin<PluginOptions> = (pluginOptions) => {
	return {
		key: PLUGIN_KEY,
		lucid: LUCID_VERSION,
		hooks: {
			build: async (props) => {
				const imports: CloudflareWorkerImport[] = [
					{
						path: `./${props.paths.outputRelativeConfigPath}`,
						default: "config",
					},
					{
						path: "@lucidcms/core/helpers",
						exports: ["processConfig"],
					},
					{
						path: "@lucidcms/core/queue-adapter",
						exports: [
							"passthroughQueueAdapter",
							"logScope",
							"executeSingleJob",
						],
					},
					{
						path: "@lucidcms/core/kv-adapter",
						exports: ["getKVAdapter"],
					},
					{
						path: "@lucidcms/core",
						exports: ["logger"],
					},
					{
						path: "./email-templates.json",
						default: "emailTemplates",
					},
				];
				const exports: CloudflareWorkerExport[] = [
					{
						name: "queue",
						async: true,
						params: ["batch", "env"],
						content: /** ts */ `const resolved = await processConfig(
    config(env, {
        emailTemplates: emailTemplates,
    }),
);
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

        const calculateExponentialBackoff = (attempts, baseDelaySeconds) => {
            return baseDelaySeconds * (2 ** (attempts - 1));
        };

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
                attempts: message.attempts - 1, // starts at 1
                maxAttempts: ${pluginOptions.maxRetries ?? MAX_RETRIES},
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
            message.retry({
                delaySeconds: calculateExponentialBackoff(message.attempts, ${pluginOptions.baseDelaySeconds ?? BASE_DELAY_SECONDS}),
            });
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
}`,
					},
				];

				if (pluginOptions.consumer === "separate") {
					return {
						error: undefined,
						data: {
							artifacts: [
								{
									type: "worker-entry",
									custom: {
										filename: "queue-consumer",
										imports,
										exports,
									},
								} satisfies RuntimeBuildArtifactCustom<CloudflareWorkerEntryArtifact>,
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
									imports,
									exports,
								},
							} satisfies RuntimeBuildArtifactCustom<CloudflareWorkerExportArtifact>,
						],
					},
				};
			},
		},
		checkCompatibility: ({ runtimeContext }) => {
			if (runtimeContext.runtime !== SUPPORTED_RUNTIME_ADAPTER_KEY) {
				throw new LucidError({
					message:
						"Cloudflare queues adapter is only supported on the Cloudflare Worker runtime adapter",
				});
			}
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
