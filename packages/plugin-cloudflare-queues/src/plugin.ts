import { LucidError } from "@lucidcms/core";
import type {
	LucidPlugin,
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

const plugin: LucidPlugin<PluginOptions> = (pluginOptions) => {
	return {
		key: PLUGIN_KEY,
		lucid: LUCID_VERSION,
		hooks: {
			build: async () => {
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
						path: "@lucidcms/core/queue",
						exports: [
							"passthroughQueueAdapter",
							"logScope",
							"executeSingleJob",
						],
					},
					{
						path: "@lucidcms/core/kv",
						exports: ["destroyKVAdapter", "getInitializedKVAdapter"],
					},
					{
						path: "@lucidcms/core/runtime",
						exports: [
							"prepareTranslations",
							"processConfig",
							"resolveDatabaseAdapter",
						],
					},
					{
						path: "@lucidcms/core/plugin",
						exports: ["createTranslator"],
					},
					{
						path: "@lucidcms/core",
						exports: ["logger"],
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
						params: ["batch", "env"],
						content: /** ts */ `if (envSchema) {
    envSchema.parse(env);
}

const lucidConfig = configFactory(env);
lucidConfig.preRenderedEmailTemplates = Object.fromEntries(
    Object.entries(emailTemplates).map(([key, value]) => [key, value.html]),
);
const databaseAdapter = await resolveDatabaseAdapter(
    db,
    env,
);
const resolved = await processConfig(
    lucidConfig,
    {
        resolvedDb: databaseAdapter,
        skipValidation: true,
    },
);
const { translationStore } = await prepareTranslations({
    config: resolved,
    bundles: i18nTranslations,
});
const translate = createTranslator({ store: translationStore, locale: "en" });
const kvInstance = await getInitializedKVAdapter(resolved, {
    env,
});

const internalQueueAdapter = passthroughQueueAdapter({
    bypassImmediateExecution: true,
});

try {
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
                    db: { client: resolved.db.client },
                    env: env || null,
                    queue: internalQueueAdapter,
                    kv: kvInstance,
                    translate,
                    request: {
                        url: resolved.baseUrl || "http://localhost",
                        locale: resolved.i18n.defaultLocale,
                    },
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
    }
} finally {
    await Promise.allSettled([
        destroyKVAdapter(kvInstance, { config: resolved, env }),
        resolved.db.client.destroy(),
    ]);
}`,
					},
				];

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
			draft.i18n.sources.push(
				"@lucidcms/plugin-cloudflare-queues/translations",
			);

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
