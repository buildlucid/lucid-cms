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
			exports: ["createApp", "processConfig", "setupCronJobs"],
		},
		{
			path: "@lucidcms/core/kv-adapter",
			exports: ["passthroughKVAdapter"],
		},
		{
			path: "./email-templates.json",
			default: "emailTemplates",
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
const resolved = await processConfig(
    wrappedDefinition.config(env),
    {
        skipValidation: true,
    },
);

const { app } = await createApp({
    config: resolved,
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
    const resolved = await processConfig(
        wrappedDefinition.config(env),
        {
            skipValidation: true,
        },
    );
    const kv = await (resolved.kv ? resolved.kv() : passthroughKVAdapter());

    const cronJobSetup = await setupCronJobs({
        createQueue: true,
    });
    await cronJobSetup.register({
        config: resolved,
        db: { client: resolved.db.client },
        queue: cronJobSetup.queue,
        env: env,
        kv: kv,
        requestUrl: "",
    });
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
