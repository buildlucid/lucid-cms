import {
	ASTRO_DEFINE_CONFIG_MODULE_ID,
	CLOUDFLARE_DEV_ENV_GLOBAL,
	CLOUDFLARE_RUNTIME_ENV_GLOBAL,
	DEFAULT_REMOTE_ADDRESS,
	HTTP_STATUS_NOT_FOUND,
	LUCID_EMAIL_TEMPLATES_MODULE_FILENAME,
	LUCID_SPA_HTML_MODULE_FILENAME,
} from "../constants.js";

/**
 * Astro's Node adapter does not expose Lucid's usual connection helper, so the
 * generated route derives a stable client address before Lucid middleware runs.
 */
export const buildNodeRouteSource = (
	configImportPath: string,
): string => `import * as lucidConfigModule from ${JSON.stringify(configImportPath)};
import lucid, { resolveConfigDefinition } from "@lucidcms/core/runtime";
import { getRuntimeContext } from "@lucidcms/node-adapter/runtime";
import { createLucidSpaResponse, shouldServeLucidSpaShell } from "@lucidcms/astro/runtime";
import emailTemplates from "./${LUCID_EMAIL_TEMPLATES_MODULE_FILENAME}";
import spaHtml from "./${LUCID_SPA_HTML_MODULE_FILENAME}";

export const prerender = false;

let appPromise;

const resolveRemoteAddress = (request) => {
\t// Astro proxies Lucid requests through its own server, so we recover the user IP here instead of assuming a dedicated Lucid server layer.
\tconst forwardedFor = request.headers.get("x-forwarded-for");
\tconst firstForwardedAddress = forwardedFor?.split(",")[0]?.trim();
\treturn (
\t\tfirstForwardedAddress ||
\t\trequest.headers.get("x-real-ip") ||
\t\trequest.headers.get("cf-connecting-ip") ||
\t\t${JSON.stringify(DEFAULT_REMOTE_ADDRESS)}
\t);
};

const ensureApp = async () => {
\tif (!appPromise) {
\t\tappPromise = (async () => {
\t\t\tconst { config: resolvedConfig, env } = await resolveConfigDefinition({
\t\t\t\tdefinition: lucidConfigModule.default,
\t\t\t\tenvSchema: lucidConfigModule.envSchema,
\t\t\t\tdefineConfigPath: ${JSON.stringify(ASTRO_DEFINE_CONFIG_MODULE_ID)},
\t\t\t\tmeta: {
\t\t\t\t\temailTemplates,
\t\t\t\t},
\t\t\t\tprocessConfigOptions: {
\t\t\t\t\tbypassCache: true,
\t\t\t\t},
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

\tif (response.status === ${HTTP_STATUS_NOT_FOUND} && shouldServeLucidSpaShell(pathname, context.request.method)) {
\t\treturn createLucidSpaResponse(spaHtml, context.request.method);
\t}

\treturn response;
};
`;

/**
 * The Cloudflare route is generated as Astro code so it can marry Astro's
 * request context with the Lucid app instance that Hono expects.
 */
export const buildCloudflareRouteSource = (
	configImportPath: string,
): string => `export const prerender = false;

let appPromise;
let runtimeModulesPromise;
let currentExecutionContext = null;

const getCloudflareEnv = () => {
\tconst env =
\t\tglobalThis[${JSON.stringify(CLOUDFLARE_RUNTIME_ENV_GLOBAL)}] ??
\t\tglobalThis[${JSON.stringify(CLOUDFLARE_DEV_ENV_GLOBAL)}];

\tif (!env) {
\t\tthrow new Error(
\t\t\t"Lucid Astro could not access the Cloudflare Worker env bindings for this request.",
\t\t);
\t}

\treturn env;
};

const loadRuntimeModules = async () => {
\tif (!runtimeModulesPromise) {
\t\truntimeModulesPromise = Promise.all([
\t\t\timport(${JSON.stringify(configImportPath)}),
\t\t\timport("@lucidcms/core/runtime"),
\t\t\timport("@lucidcms/cloudflare-adapter/runtime"),
\t\t\timport("@lucidcms/astro/runtime"),
\t\t\timport("./${LUCID_EMAIL_TEMPLATES_MODULE_FILENAME}"),
\t\t\timport("./${LUCID_SPA_HTML_MODULE_FILENAME}"),
\t\t]).then(
\t\t\t([
\t\t\t\tlucidConfigModule,
\t\t\t\truntimeModule,
\t\t\t\truntimeContextModule,
\t\t\t\tastroRuntimeModule,
\t\t\t\temailTemplatesModule,
\t\t\t\tspaHtmlModule,
\t\t\t]) => ({
\t\t\t\tdefinition: lucidConfigModule.default,
\t\t\t\tenvSchema: lucidConfigModule.envSchema,
\t\t\t\tlucid: runtimeModule.default,
\t\t\t\tresolveConfigDefinition: runtimeModule.resolveConfigDefinition,
\t\t\t\tgetRuntimeContext: runtimeContextModule.getRuntimeContext,
\t\t\t\tcreateLucidSpaResponse: astroRuntimeModule.createLucidSpaResponse,
\t\t\t\tshouldServeLucidSpaShell:
\t\t\t\t\tastroRuntimeModule.shouldServeLucidSpaShell,
\t\t\t\temailTemplates: emailTemplatesModule.default,
\t\t\t\tspaHtml: spaHtmlModule.default,
\t\t\t}),
\t\t);
\t}

\treturn runtimeModulesPromise;
};

const ensureApp = async () => {
\tif (!appPromise) {
\t\tappPromise = (async () => {
\t\t\tconst cloudflareEnv = getCloudflareEnv();
\t\t\tconst {
\t\t\t\tdefinition,
\t\t\t\tenvSchema,
\t\t\t\tlucid,
\t\t\t\tresolveConfigDefinition,
\t\t\t\tgetRuntimeContext,
\t\t\t\temailTemplates,
\t\t\t} = await loadRuntimeModules();

\t\t\tconst { config: resolvedConfig } = await resolveConfigDefinition({
\t\t\t\tdefinition,
\t\t\t\tenvSchema,
\t\t\t\tdefineConfigPath: ${JSON.stringify(ASTRO_DEFINE_CONFIG_MODULE_ID)},
\t\t\t\tmeta: {
\t\t\t\t\temailTemplates,
\t\t\t\t},
\t\t\t\tenv: cloudflareEnv,
\t\t\t\tprocessConfigOptions: {
\t\t\t\t\tbypassCache: true,
\t\t\t\t\tskipPluginVersionCheck: true,
\t\t\t\t},
\t\t\t});

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
\t\t\t\t\t\t\t\tlet executionContext = currentExecutionContext;
\t\t\t\t\t\t\t\ttry {
\t\t\t\t\t\t\t\t\texecutionContext = c.executionCtx ?? currentExecutionContext;
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
\tconst {
\t\tcreateLucidSpaResponse,
\t\tshouldServeLucidSpaShell,
\t\tspaHtml,
\t} = await loadRuntimeModules();
\tconst { app } = await ensureApp();
\t// Astro passes the execution context through locals, so we hold it briefly while Hono builds the request context.
\tcurrentExecutionContext = context.locals?.cfContext ?? null;
\tconst response = await app.fetch(
\t\tcontext.request,
\t\tcloudflareEnv,
\t\tcurrentExecutionContext,
\t);
\tcurrentExecutionContext = null;
\tconst pathname = new URL(context.request.url).pathname;

\tif (response.status === ${HTTP_STATUS_NOT_FOUND} && shouldServeLucidSpaShell(pathname, context.request.method)) {
\t\treturn createLucidSpaResponse(spaHtml, context.request.method);
\t}

\treturn response;
};
`;
