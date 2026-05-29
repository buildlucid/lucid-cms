import type {
	CloudflareWorkerExport,
	CloudflareWorkerExportArtifact,
	CloudflareWorkerImport,
} from "@lucidcms/cloudflare-adapter/types";
import { LucidError } from "@lucidcms/core";
import { mergeTranslationBundles } from "@lucidcms/core/plugin";
import type {
	LucidPlugin,
	RuntimeBuildArtifactCustom,
} from "@lucidcms/core/types";
import cloudflareQueuesAdapter from "./adapter.js";
import {
	BASE_DELAY_SECONDS,
	LUCID_VERSION,
	MAX_RETRIES,
	PLUGIN_KEY,
	SUPPORTED_RUNTIME_ADAPTER_KEY,
} from "./constants.js";
import serverTranslations from "./translations/en.server.json" with {
	type: "json",
};
import type { PluginOptions } from "./types.js";

const plugin: LucidPlugin<PluginOptions> = (pluginOptions) => {
	return {
		key: PLUGIN_KEY,
		lucid: LUCID_VERSION,
		hooks: {
			build: async (props) => {
				const configImportPath = `./${props.paths.outputRelativeConfigPath}`;
				const imports: CloudflareWorkerImport[] = [
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
						exports: ["createConfiguredDatabaseAdapter", "processConfig"],
					},
					{
						path: "@lucidcms/core/plugin",
						exports: ["createTranslator", "mergeTranslationBundles"],
					},
					{
						path: props.definition.database.module,
						default: "ConfiguredDatabaseAdapter",
					},
					{
						path: "@lucidcms/core",
						exports: [
							{ name: "configureLucid", as: "coreConfigureLucid" },
							"logger",
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
						params: ["batch", "env"],
						content: /** ts */ `const { default: configDefinition, env: envSchema } =
    await import(${JSON.stringify(configImportPath)});

if (envSchema) {
    envSchema.parse(env);
}

const wrappedDefinition = coreConfigureLucid(configDefinition);
const lucidConfig = wrappedDefinition.config(env);
lucidConfig.preRenderedEmailTemplates = Object.fromEntries(
    Object.entries(emailTemplates).map(([key, value]) => [key, value.html]),
);
lucidConfig.i18n = {
    ...lucidConfig.i18n,
    translations: mergeTranslationBundles(
        lucidConfig.i18n?.translations,
        i18nTranslations,
    ),
};
const databaseAdapter = createConfiguredDatabaseAdapter(
    ConfiguredDatabaseAdapter,
    wrappedDefinition.database,
    env,
);
const resolved = await processConfig(
    lucidConfig,
    {
        resolvedDb: databaseAdapter,
        skipValidation: true,
    },
);
const translate = createTranslator({ config: resolved, locale: "en" });
const kvInstance = await getInitializedKVAdapter(resolved, { env });

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
                        locale: resolved.i18n.interface.defaultLocale,
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
			draft.i18n.translations = mergeTranslationBundles(
				draft.i18n.translations,
				{ en: { server: serverTranslations } },
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
