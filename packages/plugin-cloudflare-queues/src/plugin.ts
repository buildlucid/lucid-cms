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
	LUCID_VERSION,
	PLUGIN_KEY,
	SUPPORTED_RUNTIME_ADAPTER_KEY,
} from "./constants.js";
import type { PluginOptions } from "./types.js";
import { createWranglerArtifact } from "./utils/wrangler-artifact.js";

const validateOptions = (options: PluginOptions) => {
	for (const [name, value] of [
		["binding", options.binding],
		["queueName", options.queueName],
	] as const) {
		if (value !== undefined && value.trim().length === 0) {
			throw new TypeError(`${name} cannot be empty.`);
		}
	}
};

/** Configures Lucid to publish and consume jobs with Cloudflare Queues. */
const plugin = (pluginOptions?: PluginOptions): LucidPluginResponse => {
	const resolvedOptions = pluginOptions ?? {};
	validateOptions(resolvedOptions);

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
						path: "@lucidcms/core/extension",
						exports: ["consumeJob", "logScopes"],
					},
					{
						path: "@lucidcms/core/runtime",
						exports: ["createLucidHost", "logger"],
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

    for (const message of batch.messages) {
        try {
			const body = message.body;
			if (!body || body.version !== 1 || typeof body.jobId !== "string") {
				logger.error({
					message: "Ignoring an invalid Cloudflare queue message",
					scope: logScopes.queueAdapter,
				});
				message.ack();
				continue;
			}
			const { jobId } = body;

            logger.debug({
                message: "Processing Cloudflare queue message",
                scope: logScopes.queueAdapter,
				data: { jobId },
            });

			const result = await consumeJob(serviceContext, { jobId });
			if (result.type === "retry-transport") {
				message.retry(
					result.delayMs === undefined
						? undefined
						: { delaySeconds: Math.ceil(result.delayMs / 1000) },
				);
				continue;
			}
			message.ack();
        } catch (error) {
            logger.error({
                message: "Error processing queue message",
                scope: logScopes.queueAdapter,
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
			draft.queue.adapter = cloudflareQueuesAdapter(resolvedOptions);
		},
	};
};

export default plugin;
