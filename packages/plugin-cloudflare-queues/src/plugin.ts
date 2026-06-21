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

const plugin = (pluginOptions?: PluginOptions): LucidPluginResponse => {
	const resolvedOptions = pluginOptions ?? {};

	return {
		key: PLUGIN_KEY,
		lucid: LUCID_VERSION,
		hooks: {
			runtime: async () => {
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
						path: "@lucidcms/core/kv",
						exports: ["destroyKVAdapter", "getInitializedKVAdapter"],
					},
					{
						path: "@lucidcms/core/media",
						exports: ["destroyMediaAdapter", "getInitializedMediaAdapter"],
					},
					{
						path: "@lucidcms/core/email",
						exports: ["destroyEmailAdapter", "getInitializedEmailAdapter"],
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
						path: "@lucidcms/runtime-cloudflare/runtime",
						exports: ["getRuntimeContext"],
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
						content: /** ts */ `const resolveRuntime = async () => {
    const runtimeValue = typeof runtime === "function" ? runtime() : runtime;
    const runtimeAdapter = await runtimeValue;

    if (!runtimeAdapter || typeof runtimeAdapter !== "object") {
        throw new Error(
            "Lucid Cloudflare runtime could not resolve the configured runtime adapter.",
        );
    }

    return runtimeAdapter;
};

const runtimeAdapter = await resolveRuntime();

if (envSchema) {
    envSchema.parse(env);
}
await runtimeAdapter.resolveOptions?.(env);

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
const runtimeContext = getRuntimeContext({
    server: "cloudflare",
    compiled: true,
});

let kvInstance;
let media;
let email;

try {
    kvInstance = await getInitializedKVAdapter(resolved, {
        env,
        runtimeContext,
    });
    media = await getInitializedMediaAdapter(resolved, {
        env,
        runtimeContext,
    });
    email = await getInitializedEmailAdapter(resolved, {
        env,
        runtimeContext,
    });

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
                    db: { client: resolved.db.client },
                    env: env || null,
                    runtimeContext,
                    queue: internalQueueAdapter,
                    kv: kvInstance,
                    media,
                    email,
                    translate,
                    request: {
                        url: resolved.host || "http://localhost",
                        locale: resolved.i18n.defaultLocale,
                    },
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
    await Promise.allSettled([
        kvInstance
            ? destroyKVAdapter(kvInstance, { config: resolved, env, runtimeContext })
            : undefined,
        media
            ? destroyMediaAdapter(media, { config: resolved, env, runtimeContext })
            : undefined,
        email
            ? destroyEmailAdapter(email, { config: resolved, env, runtimeContext })
            : undefined,
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
