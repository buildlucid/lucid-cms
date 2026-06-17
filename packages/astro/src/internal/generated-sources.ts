import astroConstants from "../constants.js";

type ConfigArtifactImportPaths = {
	config: string;
	env: string;
	db: string;
	runtime: string;
};

const resolveRuntimeSource = `const resolveRuntime = async () => {
\tconst runtimeValue = typeof runtime === "function" ? runtime() : runtime;
\tconst runtimeAdapter = await runtimeValue;

\tif (!runtimeAdapter || typeof runtimeAdapter !== "object") {
\t\tthrow new Error(
\t\t\t"Lucid Astro could not resolve the configured runtime adapter.",
\t\t);
\t}

\treturn runtimeAdapter;
};`;

/**
 * Astro's Node adapter does not expose Lucid's usual connection helper, so the
 * generated route derives a stable client address before Lucid middleware runs.
 */
export const buildNodeRouteSource = (
	configArtifacts: ConfigArtifactImportPaths,
): string => {
	return `import configFactory from ${JSON.stringify(configArtifacts.config)};
import { env as envSchema } from ${JSON.stringify(configArtifacts.env)};
import db from ${JSON.stringify(configArtifacts.db)};
import runtime from ${JSON.stringify(configArtifacts.runtime)};
import { createApp, prepareTranslations, processConfig, resolveDatabaseAdapter } from "@lucidcms/core/runtime";
import { getRuntimeContext } from "@lucidcms/runtime-node/runtime";
import { createLucidSpaResponse, shouldServeLucidSpaShell } from "@lucidcms/astro/internal/runtime";
import configureLucid from ${JSON.stringify(astroConstants.integration.configureLucidModuleId)};
import emailTemplates from "./${astroConstants.files.emailTemplatesModule}";
import i18nTranslations from "./${astroConstants.files.i18nTranslationsModule}";
import spaHtml from "./${astroConstants.files.spaHtmlModule}";

export const prerender = false;

let appPromise;

const silentLogger = {
\tinstance: {
\t\tinfo: () => {},
\t\twarn: () => {},
\t\terror: () => {},
\t\tlog: () => {},
\t\tsuccess: () => {},
\t\tcolor: {
\t\t\tblue: (value) => String(value),
\t\t},
\t},
\tsilent: true,
};

const resolveRemoteAddress = (request) => {
\t// Astro proxies Lucid requests through its own server, so we recover the user IP here instead of assuming a dedicated Lucid server layer.
\tconst forwardedFor = request.headers.get("x-forwarded-for");
\tconst firstForwardedAddress = forwardedFor?.split(",")[0]?.trim();
\treturn (
\t\tfirstForwardedAddress ||
\t\trequest.headers.get("x-real-ip") ||
\t\trequest.headers.get("cf-connecting-ip") ||
\t\t${JSON.stringify(astroConstants.defaults.remoteAddress)}
\t);
};

${resolveRuntimeSource}

const ensureApp = async () => {
\tif (!appPromise) {
\t\tappPromise = (async () => {
\t\t\tconst runtimeAdapter = await resolveRuntime();
\t\t\tconst wrappedDefinition = configureLucid({
\t\t\t\truntime: runtimeAdapter,
\t\t\t\tdb,
\t\t\t\tenv: envSchema,
\t\t\t\tconfig: configFactory,
\t\t\t}, {
\t\t\t\temailTemplates,
\t\t\t});
\t\t\tconst env = runtimeAdapter.getEnvVars
\t\t\t\t? await runtimeAdapter.getEnvVars({
\t\t\t\t\tlogger: silentLogger,
\t\t\t\t})
\t\t\t\t: undefined;

\t\t\tif (envSchema && env) {
\t\t\t\tenvSchema.parse(env);
\t\t\t}
\t\t\tawait runtimeAdapter.resolveOptions?.(env || {});

\t\t\tconst databaseAdapter = await resolveDatabaseAdapter(
\t\t\t\twrappedDefinition.db,
\t\t\t\tenv,
\t\t\t);
\t\t\tconst resolvedConfig = await processConfig(wrappedDefinition.config(env || {}), {
\t\t\t\tbypassCache: true,
\t\t\t\trecipe: wrappedDefinition.recipe,
\t\t\t\tresolvedDb: databaseAdapter,
\t\t\t\tskipValidation: true,
\t\t\t});
\t\t\tconst { translationStore } = await prepareTranslations({
\t\t\t\tconfig: resolvedConfig,
\t\t\t\tbundles: i18nTranslations,
\t\t\t});
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

\t\t\treturn createApp({
\t\t\t\tconfig: resolvedConfig,
\t\t\t\ttranslationStore,
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

\tif (response.status === ${astroConstants.http.notFoundStatus} && shouldServeLucidSpaShell(pathname, context.request.method)) {
\t\treturn createLucidSpaResponse(spaHtml, context.request.method);
\t}

\treturn response;
};
`;
};

/**
 * Astro pages need a generated toolkit helper so they can reuse Lucid's resolved
 * config without each project wiring the runtime setup by hand.
 */
export const buildNodeToolkitSource = (
	configArtifacts: ConfigArtifactImportPaths,
): string => {
	return `import configFactory from ${JSON.stringify(configArtifacts.config)};
import { env as envSchema } from ${JSON.stringify(configArtifacts.env)};
import db from ${JSON.stringify(configArtifacts.db)};
import runtime from ${JSON.stringify(configArtifacts.runtime)};
import { prepareTranslations, processConfig, resolveDatabaseAdapter } from "@lucidcms/core/runtime";
import { createToolkit, createToolkitServiceContext } from "@lucidcms/core/toolkit";
import configureLucid from ${JSON.stringify(astroConstants.integration.configureLucidModuleId)};
import emailTemplates from "./${astroConstants.files.emailTemplatesModule}";
import i18nTranslations from "./${astroConstants.files.i18nTranslationsModule}";

let toolkitPromise;

const silentLogger = {
\tinstance: {
\t\tinfo: () => {},
\t\twarn: () => {},
\t\terror: () => {},
\t\tlog: () => {},
\t\tsuccess: () => {},
\t\tcolor: {
\t\t\tblue: (value) => String(value),
\t\t},
\t},
\tsilent: true,
};

${resolveRuntimeSource}

/** Reuses one resolved toolkit across Astro page calls in the same server process. */
const ensureToolkit = async () => {
\tif (!toolkitPromise) {
\t\ttoolkitPromise = (async () => {
\t\t\tconst runtimeAdapter = await resolveRuntime();
\t\t\tconst wrappedDefinition = configureLucid({
\t\t\t\truntime: runtimeAdapter,
\t\t\t\tdb,
\t\t\t\tenv: envSchema,
\t\t\t\tconfig: configFactory,
\t\t\t}, {
\t\t\t\temailTemplates,
\t\t\t});
\t\t\tconst env = runtimeAdapter.getEnvVars
\t\t\t\t? await runtimeAdapter.getEnvVars({
\t\t\t\t\tlogger: silentLogger,
\t\t\t\t})
\t\t\t\t: undefined;

\t\t\tif (envSchema && env) {
\t\t\t\tenvSchema.parse(env);
\t\t\t}
\t\t\tawait runtimeAdapter.resolveOptions?.(env || {});

\t\t\tconst databaseAdapter = await resolveDatabaseAdapter(
\t\t\t\twrappedDefinition.db,
\t\t\t\tenv,
\t\t\t);
\t\t\tconst resolvedConfig = await processConfig(wrappedDefinition.config(env || {}), {
\t\t\t\tbypassCache: true,
\t\t\t\trecipe: wrappedDefinition.recipe,
\t\t\t\tresolvedDb: databaseAdapter,
\t\t\t\tskipValidation: true,
\t\t\t});
\t\t\tconst { translationStore } = await prepareTranslations({
\t\t\t\tconfig: resolvedConfig,
\t\t\t\tbundles: i18nTranslations,
\t\t\t});
\t\t\tconst context = createToolkitServiceContext({
\t\t\t\tconfig: resolvedConfig,
\t\t\t\ttranslationStore,
\t\t\t\tenv,
\t\t\t});

\t\t\treturn createToolkit(context);
\t\t})().catch((error) => {
\t\t\ttoolkitPromise = undefined;
\t\t\tthrow error;
\t\t});
\t}

\treturn toolkitPromise;
};

export const getToolkit = async () => ensureToolkit();

export default getToolkit;
`;
};

/**
 * The Cloudflare route is generated as Astro code so it can marry Astro's
 * request context with the Lucid app instance that Hono expects.
 */
export const buildCloudflareRouteSource = (
	configArtifacts: ConfigArtifactImportPaths,
): string => `import configFactory from ${JSON.stringify(configArtifacts.config)};
import { env as envSchema } from ${JSON.stringify(configArtifacts.env)};
import db from ${JSON.stringify(configArtifacts.db)};
import runtime from ${JSON.stringify(configArtifacts.runtime)};
import { createApp, prepareTranslations, processConfig, resolveDatabaseAdapter } from "@lucidcms/core/runtime";
import configureLucid from ${JSON.stringify(astroConstants.integration.configureLucidModuleId)};
import { getRuntimeContext } from "@lucidcms/runtime-cloudflare/runtime";
import { createLucidSpaResponse, shouldServeLucidSpaShell } from "@lucidcms/astro/internal/runtime";
import emailTemplates from "./${astroConstants.files.emailTemplatesModule}";
import i18nTranslations from "./${astroConstants.files.i18nTranslationsModule}";
import spaHtml from "./${astroConstants.files.spaHtmlModule}";

export const prerender = false;

let appPromise;

const getCloudflareEnv = () => {
\tconst env =
\t\tglobalThis[${JSON.stringify(astroConstants.cloudflare.runtimeEnvGlobal)}] ??
\t\tglobalThis[${JSON.stringify(astroConstants.cloudflare.devEnvGlobal)}];

\tif (!env) {
\t\tthrow new Error(
\t\t\t"Lucid Astro could not access the Cloudflare Worker env bindings for this request.",
\t\t);
\t}

\treturn env;
};

${resolveRuntimeSource}

const ensureApp = async () => {
\tif (!appPromise) {
\t\tappPromise = (async () => {
\t\t\tconst cloudflareEnv = getCloudflareEnv();
\t\t\tconst runtimeAdapter = await resolveRuntime();

\t\t\tif (envSchema) {
\t\t\t\tenvSchema.parse(cloudflareEnv);
\t\t\t}
\t\t\tawait runtimeAdapter.resolveOptions?.(cloudflareEnv);

\t\t\tconst wrappedDefinition = configureLucid({
\t\t\t\truntime: runtimeAdapter,
\t\t\t\tdb,
\t\t\t\tenv: envSchema,
\t\t\t\tconfig: configFactory,
\t\t\t}, {
\t\t\t\temailTemplates,
\t\t\t});
\t\t\tconst databaseAdapter = await resolveDatabaseAdapter(
\t\t\t\twrappedDefinition.db,
\t\t\t\tcloudflareEnv,
\t\t\t);
\t\t\tconst resolvedConfig = await processConfig(wrappedDefinition.config(cloudflareEnv), {
\t\t\t\tbypassCache: true,
\t\t\t\trecipe: wrappedDefinition.recipe,
\t\t\t\tresolvedDb: databaseAdapter,
\t\t\t\tskipValidation: true,
\t\t\t});
\t\t\tconst { translationStore } = await prepareTranslations({
\t\t\t\tconfig: resolvedConfig,
\t\t\t\tbundles: i18nTranslations,
\t\t\t});

\t\t\treturn createApp({
\t\t\t\tconfig: resolvedConfig,
\t\t\t\ttranslationStore,
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
\t\t\t\t\t\t\t\tlet executionContext = null;
\t\t\t\t\t\t\t\ttry {
\t\t\t\t\t\t\t\t\texecutionContext = c.executionCtx ?? null;
\t\t\t\t\t\t\t\t} catch {}
\t\t\t\t\t\t\t\tc.set(
\t\t\t\t\t\t\t\t\t"ctx",
\t\t\t\t\t\t\t\t\texecutionContext
\t\t\t\t\t\t\t\t\t\t? {
\t\t\t\t\t\t\t\t\t\t\t\t// Astro owns the request lifecycle, so Lucid only receives the pieces its middleware stack depends on.
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
\tconst cloudflareEnv = getCloudflareEnv();
\tconst { app } = await ensureApp();
\tconst response = await app.fetch(
\t\tcontext.request,
\t\tcloudflareEnv,
\t\tcontext.locals?.cfContext ?? undefined,
\t);
\tconst pathname = new URL(context.request.url).pathname;

\tif (response.status === ${astroConstants.http.notFoundStatus} && shouldServeLucidSpaShell(pathname, context.request.method)) {
\t\treturn createLucidSpaResponse(spaHtml, context.request.method);
\t}

\treturn response;
};
`;

/**
 * Cloudflare projects need a generated toolkit helper that can work both during
 * request handling and during Astro prerendering.
 */
export const buildCloudflareToolkitSource = (
	configArtifacts: ConfigArtifactImportPaths,
): string => `import configFactory from ${JSON.stringify(configArtifacts.config)};
import { env as envSchema } from ${JSON.stringify(configArtifacts.env)};
import db from ${JSON.stringify(configArtifacts.db)};
import runtime from ${JSON.stringify(configArtifacts.runtime)};
import { prepareTranslations, processConfig, resolveDatabaseAdapter } from "@lucidcms/core/runtime";
import { createToolkit, createToolkitServiceContext } from "@lucidcms/core/toolkit";
import configureLucid from ${JSON.stringify(astroConstants.integration.configureLucidModuleId)};
import emailTemplates from "./${astroConstants.files.emailTemplatesModule}";
import i18nTranslations from "./${astroConstants.files.i18nTranslationsModule}";

let toolkitPromise;

/** Reads the build-time Lucid context captured during Astro setup for prerender. */
const getPrerenderContext = () =>
\tglobalThis[${JSON.stringify(astroConstants.cloudflare.prerenderContextGlobal)}] ??
\tnull;

/** Reads Cloudflare env bindings when they exist without forcing prerender to fail. */
const readCloudflareEnv = () =>
\tglobalThis[${JSON.stringify(astroConstants.cloudflare.runtimeEnvGlobal)}] ??
\tglobalThis[${JSON.stringify(astroConstants.cloudflare.devEnvGlobal)}] ??
\tnull;

/** Ensures request-time toolkit calls fail clearly when Worker bindings are missing. */
const getCloudflareEnv = () => {
\tconst env = readCloudflareEnv();

\tif (!env) {
\t\tthrow new Error(
\t\t\t"Lucid Astro could not access the Cloudflare Worker env bindings for this request.",
\t\t);
\t}

\treturn env;
};

${resolveRuntimeSource}

/** Reuses one resolved toolkit across Astro page calls in the same server process. */
const ensureToolkit = async () => {
\tif (!toolkitPromise) {
\t\ttoolkitPromise = (async () => {
\t\t\tconst cloudflareEnv = readCloudflareEnv();
\t\t\tconst prerenderContext = !cloudflareEnv ? getPrerenderContext() : null;

\t\t\tif (prerenderContext) {
\t\t\t\treturn createToolkit(createToolkitServiceContext(prerenderContext));
\t\t\t}
\t\t\tconst resolvedCloudflareEnv = getCloudflareEnv();
\t\t\tconst runtimeAdapter = await resolveRuntime();

\t\t\tif (envSchema) {
\t\t\t\tenvSchema.parse(resolvedCloudflareEnv);
\t\t\t}
\t\t\tawait runtimeAdapter.resolveOptions?.(resolvedCloudflareEnv);

\t\t\tconst wrappedDefinition = configureLucid({
\t\t\t\truntime: runtimeAdapter,
\t\t\t\tdb,
\t\t\t\tenv: envSchema,
\t\t\t\tconfig: configFactory,
\t\t\t}, {
\t\t\t\temailTemplates,
\t\t\t});
\t\t\tconst databaseAdapter = await resolveDatabaseAdapter(
\t\t\t\twrappedDefinition.db,
\t\t\t\tresolvedCloudflareEnv,
\t\t\t);
\t\t\tconst resolvedConfig = await processConfig(
\t\t\t\twrappedDefinition.config(resolvedCloudflareEnv),
\t\t\t\t{
\t\t\t\t\tbypassCache: true,
\t\t\t\t\trecipe: wrappedDefinition.recipe,
\t\t\t\t\tresolvedDb: databaseAdapter,
\t\t\t\t\tskipValidation: true,
\t\t\t\t},
\t\t\t);
\t\t\tconst { translationStore } = await prepareTranslations({
\t\t\t\tconfig: resolvedConfig,
\t\t\t\tbundles: i18nTranslations,
\t\t\t});
\t\t\tconst context = createToolkitServiceContext({
\t\t\t\tconfig: resolvedConfig,
\t\t\t\ttranslationStore,
\t\t\t\tenv: resolvedCloudflareEnv,
\t\t\t});

\t\t\treturn createToolkit(context);
\t\t})().catch((error) => {
\t\t\ttoolkitPromise = undefined;
\t\t\tthrow error;
\t\t});
\t}

\treturn toolkitPromise;
};

export const getToolkit = async () => ensureToolkit();

export default getToolkit;
`;
