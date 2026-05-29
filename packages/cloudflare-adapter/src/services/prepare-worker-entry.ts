import type { RuntimeBuildArtifactCustom } from "@lucidcms/core/types";
import constants from "../constants.js";
import type {
	CloudflareWorkerExport,
	CloudflareWorkerExportArtifact,
	CloudflareWorkerImport,
} from "../types.js";

/**
 * Prepares the main worker entry file and add additional imports/exports from custom artifacts
 */
const prepareMainWorkerEntry = (
	configPath: string,
	databaseAdapterImportPath: string,
	customArtifacts: RuntimeBuildArtifactCustom[],
): {
	imports: CloudflareWorkerImport[];
	exports: CloudflareWorkerExport[];
} => {
	const imports: CloudflareWorkerImport[] = [
		{
			path: `./${configPath}`,
			default: "config",
		},
		{
			path: "@lucidcms/core/runtime",
			exports: [
				"createApp",
				"createConfiguredDatabaseAdapter",
				"prepareTranslations",
				"processConfig",
				"setupCronJobs",
			],
		},
		{
			path: databaseAdapterImportPath,
			default: "ConfiguredDatabaseAdapter",
		},
		{
			path: "@lucidcms/core/kv",
			exports: ["destroyKVAdapter", "getInitializedKVAdapter"],
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
			path: "@lucidcms/cloudflare-adapter",
			exports: ["configureLucid"],
		},
		{
			path: "@lucidcms/cloudflare-adapter/runtime",
			exports: ["getRuntimeContext"],
		},
	];

	const exports: CloudflareWorkerExport[] = [
		{
			name: "fetch",
			async: true,
			params: ["request", "env", "ctx"],
			content: /** ts */ `const wrappedDefinition = configureLucid(config, {
    emailTemplates: emailTemplates,
});
const databaseAdapter = createConfiguredDatabaseAdapter(
    ConfiguredDatabaseAdapter,
    wrappedDefinition.database,
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

const { app } = await createApp({
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
                    c.env = Object.assign(c.env, env);
                    c.set("cf", env.cf);
                    c.set("caches", env.caches);
                    c.set("ctx", {
                        waitUntil: ctx.waitUntil,
                        passThroughOnException: ctx.passThroughOnException,
                    });
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

return app.fetch(request, env, ctx);`,
		},
		{
			name: "scheduled",
			async: true,
			params: ["controller", "env", "ctx"],
			content: /** ts */ `const runCronService = async () => {
    const wrappedDefinition = configureLucid(config, {
        emailTemplates: emailTemplates,
    });
    const databaseAdapter = createConfiguredDatabaseAdapter(
        ConfiguredDatabaseAdapter,
        wrappedDefinition.database,
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
const kv = await getInitializedKVAdapter(resolved, {
        env,
        runtimeContext,
    });

    try {
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
            kv: kv,
            request: {
                url: resolved.baseUrl || "http://localhost",
                locale: resolved.i18n.defaultLocale,
            },
            translate,
        }, {
            schedule: controller.cron,
        });
    } finally {
        await Promise.allSettled([
            destroyKVAdapter(kv, { config: resolved, env, runtimeContext }),
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
