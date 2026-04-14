import path from "node:path";
import type {
	CloudflareWorkerEntryArtifact,
	CloudflareWorkerExport,
	CloudflareWorkerExportArtifact,
	CloudflareWorkerImport,
} from "@lucidcms/cloudflare-adapter/types";
import type {
	RuntimeAdapter,
	RuntimeBuildArtifactCustom,
} from "@lucidcms/core/types";
import type { AstroAdapter } from "astro";
import type { LucidAstroRuntime } from "./types.js";

export const toPosixPath = (value: string): string =>
	value.split(path.sep).join("/");

export const toImportPath = (fromDir: string, targetPath: string): string => {
	const relativePath = toPosixPath(path.relative(fromDir, targetPath));
	return relativePath.startsWith(".") ? relativePath : `./${relativePath}`;
};

export const detectLucidRuntime = (
	adapter: RuntimeAdapter | undefined,
): LucidAstroRuntime => {
	if (!adapter) {
		throw new Error(
			"Lucid Astro integration requires `export const adapter = nodeAdapter()` or `cloudflareAdapter()` in lucid.config.ts.",
		);
	}

	if (adapter.key === "node" || adapter.key === "cloudflare") {
		return adapter.key;
	}

	throw new Error(
		`Lucid Astro integration does not support the "${adapter.key}" runtime adapter yet.`,
	);
};

export const detectAstroRuntime = (
	astroAdapter: AstroAdapter | undefined,
): LucidAstroRuntime | null => {
	if (!astroAdapter) {
		return null;
	}

	const adapterName = astroAdapter.name.toLowerCase();

	if (adapterName.includes("cloudflare")) {
		return "cloudflare";
	}

	if (adapterName.includes("node")) {
		return "node";
	}

	return null;
};

export const assertAstroCompatibility = (
	lucidRuntime: LucidAstroRuntime,
	astroAdapter: AstroAdapter | undefined,
): LucidAstroRuntime => {
	const astroRuntime = detectAstroRuntime(astroAdapter);

	if (!astroRuntime) {
		throw new Error(
			"Lucid Astro integration requires an Astro adapter. Add `@astrojs/node` or `@astrojs/cloudflare` to astro.config.*.",
		);
	}

	if (astroRuntime !== lucidRuntime) {
		throw new Error(
			`Lucid is configured for the "${lucidRuntime}" runtime, but Astro is using the "${astroRuntime}" adapter. These runtimes must match.`,
		);
	}

	return astroRuntime;
};

const mergeWorkerImports = (importsInput: CloudflareWorkerImport[]) => {
	const importTracker = new Map<
		string,
		{ default?: string; exports: Set<string> }
	>();

	for (const imp of importsInput) {
		const existing = importTracker.get(imp.path) || {
			exports: new Set<string>(),
		};

		if (imp.default) {
			existing.default = imp.default;
		}

		if (imp.exports) {
			for (const namedExport of imp.exports) {
				existing.exports.add(namedExport);
			}
		}

		importTracker.set(imp.path, existing);
	}

	const imports: string[] = [];
	for (const [importPath, data] of importTracker) {
		const parts: string[] = [];
		if (data.default) {
			parts.push(data.default);
		}
		if (data.exports.size > 0) {
			parts.push(`{ ${Array.from(data.exports).join(", ")} }`);
		}

		imports.push(
			parts.length > 0
				? `import ${parts.join(", ")} from ${JSON.stringify(importPath)};`
				: `import ${JSON.stringify(importPath)};`,
		);
	}

	return imports;
};

const renderWorkerHandlers = (
	exportsInput: CloudflareWorkerExport[],
): string[] =>
	exportsInput.map((exp) => {
		const asyncKeyword = exp.async ? "async " : "";
		const params = exp.params?.join(", ") ?? "";
		return `${asyncKeyword}${exp.name}(${params}) { ${exp.content} }`;
	});

export const buildCloudflareWorkerModule = (props: {
	imports: CloudflareWorkerImport[];
	exports: CloudflareWorkerExport[];
	includeAstroHandler?: boolean;
}): string => {
	const importLines = mergeWorkerImports(props.imports);
	const handlerLines = renderWorkerHandlers(props.exports);

	if (props.includeAstroHandler) {
		importLines.unshift(
			'import astroWorker from "@astrojs/cloudflare/entrypoints/server";',
		);
	}

	const workerProperties = [
		...(props.includeAstroHandler ? ["...astroWorker"] : []),
		...handlerLines,
	];

	return `${importLines.join("\n")}

const worker = {
	${workerProperties.join(",\n\t")}
};

export default worker;
`;
};

export const buildCloudflareMainWorkerSource = (props: {
	configImportPath: string;
	customArtifacts: RuntimeBuildArtifactCustom[];
}): string => {
	const imports: CloudflareWorkerImport[] = [
		{
			path: props.configImportPath.startsWith(".")
				? props.configImportPath
				: `./${props.configImportPath}`,
			default: "config",
		},
		{
			path: "@lucidcms/core",
			default: "lucid",
		},
		{
			path: "@lucidcms/core/kv-adapter",
			exports: ["passthroughKVAdapter"],
		},
		{
			path: "@lucidcms/core/helpers",
			exports: ["processConfig"],
		},
		{
			path: "./email-templates.json",
			default: "emailTemplates",
		},
	];
	const exports: CloudflareWorkerExport[] = [
		{
			name: "scheduled",
			async: true,
			params: ["controller", "env", "ctx"],
			content: `const runCronService = async () => {
	const resolvedConfig = await processConfig(
		config(env, {
			emailTemplates,
		}),
		{
			bypassCache: true,
		},
	);
	const kv = await (resolvedConfig.kv
		? resolvedConfig.kv()
		: passthroughKVAdapter());

	const cronJobSetup = await lucid.setupCronJobs({
		createQueue: true,
	});
	await cronJobSetup.register({
		config: resolvedConfig,
		db: { client: resolvedConfig.db.client },
		queue: cronJobSetup.queue,
		env,
		kv,
		requestUrl: "",
	});
};

ctx.waitUntil(runCronService());`,
		},
	];

	for (const artifact of props.customArtifacts) {
		if (artifact.type !== "worker-export") {
			continue;
		}

		const custom = artifact.custom as CloudflareWorkerExportArtifact;
		imports.push(...custom.imports);
		exports.push(...custom.exports);
	}

	return buildCloudflareWorkerModule({
		imports,
		exports,
		includeAstroHandler: true,
	});
};

export const buildCloudflareAdditionalWorkers = (
	customArtifacts: RuntimeBuildArtifactCustom[],
): Array<{ filename: string; source: string }> => {
	return customArtifacts
		.filter((artifact) => artifact.type === "worker-entry")
		.map((artifact) => {
			const custom = artifact.custom as CloudflareWorkerEntryArtifact;
			const filename = path.basename(custom.filename);

			return {
				filename,
				source: buildCloudflareWorkerModule({
					imports: custom.imports,
					exports: custom.exports,
				}),
			};
		});
};

export const buildNodeRouteSource = (
	configImportPath: string,
): string => `import * as lucidConfigModule from ${JSON.stringify(configImportPath)};
import lucid from "@lucidcms/core";
import { processConfig } from "@lucidcms/core/helpers";
import { getRuntimeContext } from "@lucidcms/node-adapter";
import { createLucidSpaResponse, shouldServeLucidSpaShell } from "@lucidcms/astro/runtime";
import emailTemplates from "./lucid-email-templates.generated.ts";
import spaHtml from "./lucid-spa-html.generated.ts";

export const prerender = false;

const configFactory = lucidConfigModule.default;
const envSchema =
\ttypeof Reflect !== "undefined"
\t\t? Reflect.get(lucidConfigModule, "envSchema")
\t\t: undefined;

let appPromise;
let envValidated = false;

const resolveRemoteAddress = (request) => {
\tconst forwardedFor = request.headers.get("x-forwarded-for");
\tconst firstForwardedAddress = forwardedFor?.split(",")[0]?.trim();
\treturn (
\t\tfirstForwardedAddress ||
\t\trequest.headers.get("x-real-ip") ||
\t\trequest.headers.get("cf-connecting-ip") ||
\t\t"127.0.0.1"
\t);
};

const ensureApp = async () => {
\tif (!appPromise) {
\t\tappPromise = (async () => {
\t\t\tconst env = process.env;
\t\t\tif (!envValidated && envSchema) {
\t\t\t\tenvSchema.parse(env);
\t\t\t\tenvValidated = true;
\t\t\t}

\t\t\tconst resolvedConfig = await processConfig(
\t\t\t\tconfigFactory(env, {
\t\t\t\t\temailTemplates,
\t\t\t\t}),
\t\t\t\t{
\t\t\t\t\tbypassCache: true,
\t\t\t\t},
\t\t\t);
\t\t\tconst runtimeContext = {
\t\t\t\t...getRuntimeContext({
\t\t\t\t\tcompiled: false,
\t\t\t\t}),
\t\t\t\tconfigEntryPoint: null,
\t\t\t\tgetConnectionInfo: (c) => {
\t\t\t\t\tconst address = resolveRemoteAddress(c.req.raw);
\t\t\t\t\treturn {
\t\t\t\t\t\taddress,
\t\t\t\t\t\tport: undefined,
\t\t\t\t\t\taddressType: address.includes(":") ? "IPv6" : "IPv4",
\t\t\t\t\t};
\t\t\t\t},
\t\t\t};

\t\t\treturn lucid.createApp({
\t\t\t\tconfig: resolvedConfig,
\t\t\t\tenv,
\t\t\t\truntimeContext,
\t\t\t});
\t\t})().catch((error) => {
\t\t\tappPromise = undefined;
\t\t\tthrow error;
\t\t});
\t}

\treturn appPromise;
};

export const ALL = async (context) => {
\tconst { app } = await ensureApp();
\tconst response = await app.fetch(context.request);
\tconst pathname = new URL(context.request.url).pathname;

\tif (response.status === 404 && shouldServeLucidSpaShell(pathname, context.request.method)) {
\t\treturn createLucidSpaResponse(spaHtml, context.request.method);
\t}

\treturn response;
};
`;

export const buildCloudflareRouteSource = (
	configImportPath: string,
): string => `import * as lucidConfigModule from ${JSON.stringify(configImportPath)};
import { env as cloudflareEnv } from "cloudflare:workers";
import lucid from "@lucidcms/core";
import { processConfig } from "@lucidcms/core/helpers";
import { getRuntimeContext } from "@lucidcms/cloudflare-adapter";
import { createLucidSpaResponse, shouldServeLucidSpaShell } from "@lucidcms/astro/runtime";
import emailTemplates from "./lucid-email-templates.generated.ts";
import spaHtml from "./lucid-spa-html.generated.ts";

export const prerender = false;

const configFactory = lucidConfigModule.default;
const envSchema =
\ttypeof Reflect !== "undefined"
\t\t? Reflect.get(lucidConfigModule, "envSchema")
\t\t: undefined;

let appPromise;
let envValidated = false;

const ensureApp = async () => {
\tif (!appPromise) {
\t\tappPromise = (async () => {
\t\t\tif (!envValidated && envSchema) {
\t\t\t\tenvSchema.parse(cloudflareEnv);
\t\t\t\tenvValidated = true;
\t\t\t}

\t\t\tconst resolvedConfig = await processConfig(
\t\t\t\tconfigFactory(cloudflareEnv, {
\t\t\t\t\temailTemplates,
\t\t\t\t}),
\t\t\t\t{
\t\t\t\t\tbypassCache: true,
\t\t\t\t},
\t\t\t);

\t\t\treturn lucid.createApp({
\t\t\t\tconfig: resolvedConfig,
\t\t\t\tenv: cloudflareEnv,
\t\t\t\truntimeContext: getRuntimeContext({
\t\t\t\t\tserver: "cloudflare",
\t\t\t\t\tcompiled: false,
\t\t\t\t}),
\t\t\t\thono: {
\t\t\t\t\tmiddleware: [
\t\t\t\t\t\tasync (app) => {
\t\t\t\t\t\t\tapp.use("*", async (c, next) => {
\t\t\t\t\t\t\t\tc.set("env", c.env ?? cloudflareEnv);
\t\t\t\t\t\t\t\tc.set("cf", c.req.raw.cf ?? null);
\t\t\t\t\t\t\t\tc.set("caches", globalThis.caches ?? null);
\t\t\t\t\t\t\t\tconst executionContext = c.executionCtx;
\t\t\t\t\t\t\t\tc.set(
\t\t\t\t\t\t\t\t\t"ctx",
\t\t\t\t\t\t\t\t\texecutionContext
\t\t\t\t\t\t\t\t\t\t? {
\t\t\t\t\t\t\t\t\t\t\t\twaitUntil: executionContext.waitUntil.bind(executionContext),
\t\t\t\t\t\t\t\t\t\t\t\t...(typeof executionContext.passThroughOnException === "function"
\t\t\t\t\t\t\t\t\t\t\t\t\t? {
\t\t\t\t\t\t\t\t\t\t\t\t\t\t\tpassThroughOnException:
\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\texecutionContext.passThroughOnException.bind(executionContext),
\t\t\t\t\t\t\t\t\t\t\t\t\t\t}
\t\t\t\t\t\t\t\t\t\t\t\t\t: {}),
\t\t\t\t\t\t\t\t\t\t}
\t\t\t\t\t\t\t\t\t\t: null,
\t\t\t\t\t\t\t\t);
\t\t\t\t\t\t\t\tawait next();
\t\t\t\t\t\t\t});
\t\t\t\t\t\t},
\t\t\t\t\t],
\t\t\t\t},
\t\t\t});
\t\t})().catch((error) => {
\t\t\tappPromise = undefined;
\t\t\tthrow error;
\t\t});
\t}

\treturn appPromise;
};

export const ALL = async (context) => {
\tconst { app } = await ensureApp();
\tconst response = await app.fetch(
\t\tcontext.request,
\t\tcloudflareEnv,
\t\tcontext.locals?.cfContext,
\t);
\tconst pathname = new URL(context.request.url).pathname;

\tif (response.status === 404 && shouldServeLucidSpaShell(pathname, context.request.method)) {
\t\treturn createLucidSpaResponse(spaHtml, context.request.method);
\t}

\treturn response;
};
`;
