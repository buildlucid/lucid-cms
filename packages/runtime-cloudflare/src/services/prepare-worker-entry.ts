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
			exports: ["configure"],
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
			exports: ["createLucidHost", "setupJobScheduler", "withResponseCleanup"],
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
			path: "@lucidcms/runtime-cloudflare/runtime",
			exports: [
				"getOrCreateRuntimeHost",
				"getRuntimeContext",
				"runtimeHostKeys",
			],
		},
	];

	const exports: CloudflareWorkerExport[] = [
		{
			name: "fetch",
			async: true,
			params: ["request", "env", "ctx"],
			content: /** ts */ `const runtimeContext = getRuntimeContext({
    server: "cloudflare",
    compiled: true,
});
const host = await getOrCreateRuntimeHost(
    runtimeHostKeys.http,
    () => createLucidHost({
        definition: { runtime, db, config: configFactory, configure },
        envSchema,
        env,
        runtimeContext,
        translationBundles: i18nTranslations,
        meta: { emailTemplates },
        databaseScope: "invocation",
        http: {
            extensions: [
                {
                    name: "runtime-cloudflare:platform-context",
                    phase: "beforeMiddleware",
                    register: async (app) => {
                        app.use("*", async (c, next) => {
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
                },
                {
                    name: "runtime-cloudflare:spa-shell",
                    phase: "afterSetup",
                    register: async (app) => {
                        app.get("/lucid/*", async (c) => {
                            const url = new URL(c.req.url);
                            const indexRequest = new Request(url.origin + "/lucid/index.html");
                            const indexAsset = await c.env.ASSETS.fetch(indexRequest);
                            return new Response(indexAsset.body, {
                                status: indexAsset.status,
                                headers: indexAsset.headers,
                            });
                        });
                    },
                },
            ],
        },
    }),
    (promise) => ctx.waitUntil(promise),
);
const invocation = host.createInvocation({ env });
try {
    const response = await invocation.handle({ request, executionContext: ctx });
    return withResponseCleanup(response, () => invocation.destroy());
} catch (error) {
    await invocation.destroy();
    throw error;
}`,
		},
		{
			name: "scheduled",
			async: true,
			params: ["controller", "env", "ctx"],
			content: /** ts */ `const runJobScheduler = async () => {
    const runtimeContext = getRuntimeContext({
        server: "cloudflare",
        compiled: true,
    });
    const host = await getOrCreateRuntimeHost(
        runtimeHostKeys.background,
        () => createLucidHost({
            definition: { runtime, db, config: configFactory, configure },
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
        const jobScheduler = setupJobScheduler();
        await jobScheduler.run(await invocation.getServiceContext(), {
            scheduledAt: new Date(controller.scheduledTime),
        });
    } finally {
        await invocation.destroy();
    }
};

ctx.waitUntil(runJobScheduler());`,
		},
	];

	//* merge in Cloudflare worker export artifacts
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
