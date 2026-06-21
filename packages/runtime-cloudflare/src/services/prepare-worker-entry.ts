import type { RuntimeBuildArtifactCustom } from "@lucidcms/core/types";
import constants from "../constants.js";
import type {
	CloudflareWorkerExport,
	CloudflareWorkerExportArtifact,
	CloudflareWorkerImport,
} from "../types.js";

const resolveRuntimeSource = /** ts */ `const resolveRuntime = async () => {
    const runtimeValue = typeof runtime === "function" ? runtime() : runtime;
    const runtimeAdapter = await runtimeValue;

    if (!runtimeAdapter || typeof runtimeAdapter !== "object") {
        throw new Error(
            "Lucid Cloudflare runtime could not resolve the configured runtime adapter.",
        );
    }

    return runtimeAdapter;
};`;

/**
 * Prepares the main worker entry file and add additional imports/exports from custom artifacts
 */
const prepareMainWorkerEntry = (
	configArtifacts: {
		config: string;
		env: string;
		db: string;
		runtime: string;
	},
	customArtifacts: RuntimeBuildArtifactCustom[],
): {
	imports: CloudflareWorkerImport[];
	exports: CloudflareWorkerExport[];
} => {
	const imports: CloudflareWorkerImport[] = [
		{
			path: configArtifacts.config,
			default: "configFactory",
		},
		{
			path: configArtifacts.env,
			exports: [{ name: "env", as: "envSchema" }],
		},
		{
			path: configArtifacts.db,
			default: "db",
		},
		{
			path: configArtifacts.runtime,
			default: "runtime",
		},
		{
			path: "@lucidcms/core/runtime",
			exports: [
				"createApp",
				"prepareTranslations",
				"processConfig",
				"resolveDatabaseAdapter",
				"setupCronJobs",
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
			path: "./email-templates.json",
			default: "emailTemplates",
		},
		{
			path: "./i18n-translations.json",
			default: "i18nTranslations",
		},
		{
			path: "@lucidcms/core/plugin",
			exports: ["createTranslator"],
		},
		{
			path: "@lucidcms/runtime-cloudflare/runtime",
			exports: ["getRuntimeContext"],
		},
	];

	const exports: CloudflareWorkerExport[] = [
		{
			name: "fetch",
			async: true,
			params: ["request", "env", "ctx"],
			content: /** ts */ `const lucidGlobal = globalThis as typeof globalThis & {
    __lucidCloudflareAppPromise?: Promise<Awaited<ReturnType<typeof createApp>>>;
};

	const ensureApp = async () => {
	    if (!lucidGlobal.__lucidCloudflareAppPromise) {
	        lucidGlobal.__lucidCloudflareAppPromise = (async () => {
	            ${resolveRuntimeSource}

	            const runtimeAdapter = await resolveRuntime();

	            if (envSchema) {
	                envSchema.parse(env);
	            }
	            await runtimeAdapter.resolveOptions?.(env);

	            const definition = {
	                runtime: runtimeAdapter,
	                db,
	                env: envSchema,
	                config: configFactory,
	            };
	            const wrappedDefinition = runtimeAdapter.configureLucid ? runtimeAdapter.configureLucid(definition, {
	                emailTemplates: emailTemplates,
	            }) : definition;
	            const databaseAdapter = await resolveDatabaseAdapter(
	                wrappedDefinition.db,
	                env,
	            );
	            const resolved = await processConfig(
	                wrappedDefinition.config(env),
	                {
	                    recipe: wrappedDefinition.recipe,
	                    resolvedDb: databaseAdapter,
	                    skipValidation: true,
	                },
	            );
	            const { translationStore } = await prepareTranslations({
	                config: resolved,
	                bundles: i18nTranslations,
	            });

	            return createApp({
	                config: resolved,
	                translationStore: translationStore,
	                env: env,
	                runtimeContext: getRuntimeContext({
	                    server: "cloudflare",
	                    compiled: true,
	                }),
	                hono: {
	                    middleware: [
	                        async (app, config) => {
	                            app.use("*", async (c, next) => {
	                                c.set("env", c.env ?? env ?? null);
	                                c.set("cf", c.req.raw.cf ?? null);
	                                c.set("caches", globalThis.caches ?? null);
	                                let executionContext = null;
	                                try {
	                                    executionContext = c.executionCtx ?? null;
	                                } catch {}
	                                c.set(
	                                    "ctx",
	                                    executionContext
	                                        ? {
	                                                waitUntil: executionContext.waitUntil.bind(executionContext),
	                                                ...(typeof executionContext.passThroughOnException === "function"
	                                                    ? {
	                                                            passThroughOnException:
	                                                                executionContext.passThroughOnException.bind(executionContext),
	                                                        }
	                                                    : {}),
	                                            }
	                                        : null,
	                                );
	                                await next();
	                            });
	                        },
	                    ],
	                    routes: [
	                        async (app, config) => {
	                            app.get("/lucid/*", async (c) => {
	                                const url = new URL(c.req.url);

	                                const indexRequestUrl = url.origin + "/lucid/index.html";
	                                const indexRequest = new Request(indexRequestUrl);
	                                const indexAsset = await c.env.ASSETS.fetch(indexRequest);
	                                return new Response(indexAsset.body, {
	                                    status: indexAsset.status,
	                                    headers: indexAsset.headers,
	                                });
	                            });
	                        },
	                    ],
	                },
	            });
	        })().catch((error) => {
	            delete lucidGlobal.__lucidCloudflareAppPromise;
	            throw error;
	        });
	    }

	    return lucidGlobal.__lucidCloudflareAppPromise;
	};

	const { app } = await ensureApp();
	return app.fetch(request, env, ctx);`,
		},
		{
			name: "scheduled",
			async: true,
			params: ["controller", "env", "ctx"],
			content: /** ts */ `const runCronService = async () => {
    ${resolveRuntimeSource}

    const runtimeAdapter = await resolveRuntime();

    if (envSchema) {
        envSchema.parse(env);
    }
    await runtimeAdapter.resolveOptions?.(env);

    const definition = {
        runtime: runtimeAdapter,
        db,
        env: envSchema,
        config: configFactory,
    };
    const wrappedDefinition = runtimeAdapter.configureLucid ? runtimeAdapter.configureLucid(definition, {
        emailTemplates: emailTemplates,
    }) : definition;
    const databaseAdapter = await resolveDatabaseAdapter(
        wrappedDefinition.db,
        env,
    );
    const resolved = await processConfig(
        wrappedDefinition.config(env),
        {
            recipe: wrappedDefinition.recipe,
            resolvedDb: databaseAdapter,
            skipValidation: true,
        },
    );
    const { translationStore } = await prepareTranslations({
        config: resolved,
        bundles: i18nTranslations,
    });
    const runtimeContext = getRuntimeContext({
        server: "cloudflare",
        compiled: true,
    });
    const translate = createTranslator({ store: translationStore, locale: "en" });
    let kv;
    let media;
    let email;

    try {
        kv = await getInitializedKVAdapter(resolved, {
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

        const cronJobSetup = await setupCronJobs({
            createQueue: true,
            runtimeContext,
            env,
        });
        await cronJobSetup.register({
            config: resolved,
            translationStore,
            db: { client: resolved.db.client },
            queue: cronJobSetup.queue,
            env: env,
            runtimeContext,
            kv: kv,
            media,
            email,
            request: {
                url: resolved.host || "http://localhost",
                locale: resolved.i18n.defaultLocale,
            },
            translate,
        }, {
            schedule: controller.cron,
        });
    } finally {
        await Promise.allSettled([
            kv
                ? destroyKVAdapter(kv, { config: resolved, env, runtimeContext })
                : undefined,
            media
                ? destroyMediaAdapter(media, { config: resolved, env, runtimeContext })
                : undefined,
            email
                ? destroyEmailAdapter(email, { config: resolved, env, runtimeContext })
                : undefined,
            resolved.db.client.destroy(),
        ]);
    }
};

ctx.waitUntil(runCronService());`,
		},
	];

	//* merge in worker-export artifacts
	for (const artifact of customArtifacts) {
		if (artifact.type === constants.WORKER_EXPORT_ARTIFACT_TYPE) {
			const custom = artifact.custom as CloudflareWorkerExportArtifact;
			imports.push(...custom.imports);
			exports.push(...custom.exports);
		}
	}

	return { imports, exports };
};

export default prepareMainWorkerEntry;
