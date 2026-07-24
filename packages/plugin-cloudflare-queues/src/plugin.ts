import { LucidError } from "@lucidcms/core";
import type {
	LucidPluginResponse,
	RuntimeBuildArtifactCustom,
} from "@lucidcms/core/types";
import type {
	CloudflareWorkerExport,
	CloudflareWorkerExportArtifact,
	CloudflareWorkerImport,
} from "@lucidcms/runtime-cloudflare/types";
import cloudflareQueuesAdapter from "./adapter.js";
import {
	BASE_DELAY_SECONDS,
	LUCID_VERSION,
	MAX_RETRIES,
	PLUGIN_KEY,
	SUPPORTED_RUNTIME_ADAPTER_KEY,
} from "./constants.js";
import type { PluginOptions } from "./types.js";
import { createWranglerArtifact } from "./utils/wrangler-artifact.js";

const plugin = (pluginOptions?: PluginOptions): LucidPluginResponse => {
	const resolvedOptions = pluginOptions ?? {};

	return {
		key: PLUGIN_KEY,
		lucid: LUCID_VERSION,
		hooks: {
			runtime: async ({ phase }) => {
				if (phase === "prepare") {
					return {
						error: undefined,
						data: {
							artifacts: [createWranglerArtifact(resolvedOptions)],
						},
					};
				}

				const imports: CloudflareWorkerImport[] = [
					{
						path: "./lucid/config.js",
						default: "configFactory",
					},
					{
						path: "./lucid/env.js",
						exports: [{ name: "env", as: "envSchema" }],
					},
					{
						path: "./lucid/db.js",
						default: "db",
					},
					{
						path: "./lucid/runtime.js",
						default: "runtime",
					},
					{
						path: "@lucidcms/core/queue",
						exports: [
							"passthroughQueueAdapter",
							"logScope",
							"executeSingleJob",
						],
					},
					{
						path: "@lucidcms/core/runtime",
						exports: ["createLucidHost"],
					},
					{
						path: "@lucidcms/core",
						exports: ["logger"],
					},
					{
						path: "@lucidcms/runtime-cloudflare/runtime",
						exports: [
							"getOrCreateRuntimeHost",
							"getRuntimeContext",
							"runtimeHostKeys",
						],
					},
					{
						path: "./email-templates.json",
						default: "emailTemplates",
					},
					{
						path: "./i18n-translations.json",
						default: "i18nTranslations",
					},
				];
				const exports: CloudflareWorkerExport[] = [
					{
						name: "queue",
						async: true,
						params: ["batch", "env", "ctx"],
						content: /** ts */ `const runtimeContext = getRuntimeContext({
    server: "cloudflare",
    compiled: true,
});
const host = await getOrCreateRuntimeHost(
    runtimeHostKeys.background,
    () => createLucidHost({
        definition: { runtime, db, config: configFactory },
        envSchema,
        env,
        runtimeContext,
        translationBundles: i18nTranslations,
        meta: { emailTemplates },
        databaseScope: "invocation",
    }),
    (promise) => ctx.waitUntil(promise),
);
const invocation = host.createInvocation({ env });
try {
    const serviceContext = await invocation.getServiceContext();
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
                    ...serviceContext,
                    queue: internalQueueAdapter,
                },
                {
                    jobId,
                    event,
                    payload,
                    attempts: message.attempts - 1, // starts at 1
                    maxAttempts: ${resolvedOptions.maxRetries ?? MAX_RETRIES},
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
                    delaySeconds: calculateExponentialBackoff(message.attempts, ${resolvedOptions.baseDelaySeconds ?? BASE_DELAY_SECONDS}),
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
    }
} finally {
    await invocation.destroy();
}`,
					},
				];

				return {
					error: undefined,
					data: {
						artifacts: [
							{
								type: "cloudflare:worker-export",
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
			draft.i18n.sources.push(
				"@lucidcms/plugin-cloudflare-queues/translations",
			);

			if (draft.queue?.adapter) {
				draft.queue.adapter = cloudflareQueuesAdapter(resolvedOptions);
			} else {
				draft.queue = {
					adapter: cloudflareQueuesAdapter(resolvedOptions),
				};
			}
		},
	};
};

export default plugin;
