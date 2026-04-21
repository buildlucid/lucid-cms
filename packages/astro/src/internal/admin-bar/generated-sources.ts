import astroConstants from "../../constants.js";

export const buildLucidAdminBarDevToolbarAppSource =
	(): string => `import { defineToolbarApp } from "astro/toolbar";

const stateGlobalKey = ${JSON.stringify(astroConstants.integration.adminBarStateGlobalKey)};
const stateEventName = ${JSON.stringify(astroConstants.integration.adminBarStateEvent)};
const documentationUrl = ${JSON.stringify(astroConstants.urls.documentation)};
const defaultState = {
\tdashboardHref: ${JSON.stringify(astroConstants.paths.mountPath)},
\teditHref: null,
\teditLabel: null,
};

const isRecord = (value) => typeof value === "object" && value !== null;

const readState = () => {
\tconst value = window[stateGlobalKey];
\tif (!isRecord(value)) {
\t\treturn defaultState;
\t}

\treturn {
\t\tdashboardHref:
\t\t\ttypeof value.dashboardHref === "string"
\t\t\t\t? value.dashboardHref
\t\t\t\t: defaultState.dashboardHref,
\t\teditHref: typeof value.editHref === "string" ? value.editHref : null,
\t\teditLabel: typeof value.editLabel === "string" ? value.editLabel : null,
\t};
};

const navigate = (href) => {
\tif (!href) {
\t\treturn;
\t}

\twindow.location.assign(href);
};

const openExternal = (href) => {
\tif (!href) {
\t\treturn;
\t}

\twindow.open(href, "_blank", "noopener,noreferrer");
};

const createActionButton = (label, buttonStyle, action) => {
\tconst button = document.createElement("astro-dev-toolbar-button");
\tbutton.setAttribute("button-style", buttonStyle);
\tbutton.setAttribute("size", "medium");
\tbutton.textContent = label;
\tbutton.addEventListener("click", action);
\treturn button;
};

export default defineToolbarApp({
\tinit(canvas, app) {
\t\tcanvas.innerHTML = \`
\t\t\t<style>
\t\t\t\t.lucid-dt {
\t\t\t\t\tdisplay: flex;
\t\t\t\t\tflex-direction: column;
\t\t\t\t\tgap: 18px;
\t\t\t\t}

\t\t\t\t.lucid-dt__header {
\t\t\t\t\tdisplay: flex;
\t\t\t\t\tjustify-content: space-between;
\t\t\t\t\tgap: 16px;
\t\t\t\t\talign-items: flex-start;
\t\t\t\t}

\t\t\t\t.lucid-dt__title {
\t\t\t\t\tdisplay: grid;
\t\t\t\t\tgap: 8px;
\t\t\t\t}

\t\t\t\t.lucid-dt__title h1 {
\t\t\t\t\tmargin: 0;
\t\t\t\t\tfont-size: 22px;
\t\t\t\t\tline-height: 1.1;
\t\t\t\t}

\t\t\t\t.lucid-dt__title p {
\t\t\t\t\tmargin: 0;
\t\t\t\t\tmax-width: 34rem;
\t\t\t\t\tline-height: 1.5;
\t\t\t\t}

\t\t\t\t.lucid-dt__actions {
\t\t\t\t\tdisplay: flex;
\t\t\t\t\tflex-wrap: wrap;
\t\t\t\t\tgap: 12px;
\t\t\t\t}
\t\t\t</style>
\t\t\`;

\t\tconst panel = document.createElement("section");
\t\tpanel.className = "lucid-dt";

\t\tconst header = document.createElement("header");
\t\theader.className = "lucid-dt__header";

\t\tconst title = document.createElement("div");
\t\ttitle.className = "lucid-dt__title";

\t\tconst heading = document.createElement("h1");
\t\theading.textContent = "Lucid CMS";

\t\tconst summary = document.createElement("p");
\t\tsummary.textContent = "Dashboard access is available while you work locally.";

\t\ttitle.append(heading, summary);
\t\theader.append(title);

\t\tconst actions = document.createElement("div");
\t\tactions.className = "lucid-dt__actions";

\t\tpanel.append(header, actions);

\t\tconst windowElement = document.createElement("astro-dev-toolbar-window");
\t\tconst initialPlacement = window.__astro_dev_toolbar__?.placement;
\t\tif (initialPlacement) {
\t\t\twindowElement.placement = initialPlacement;
\t\t}
\t\twindowElement.append(panel);
\t\tcanvas.append(windowElement);

\t\tconst render = () => {
\t\t\tconst state = readState();
\t\t\tsummary.textContent = state.editHref
\t\t\t\t? "Open the dashboard, docs, or the linked document."
\t\t\t\t: "Open the dashboard or docs. This page does not expose an edit link.";

\t\t\tconst nextActions = [
\t\t\t\tcreateActionButton("Dashboard", "gray", () => {
\t\t\t\t\tnavigate(state.dashboardHref);
\t\t\t\t}),
\t\t\t\tcreateActionButton("Docs", "blue", () => {
\t\t\t\t\topenExternal(documentationUrl);
\t\t\t\t}),
\t\t\t];

\t\t\tif (state.editHref) {
\t\t\t\tnextActions.push(
\t\t\t\t\tcreateActionButton(state.editLabel ?? "Edit document", "purple", () => {
\t\t\t\t\t\tnavigate(state.editHref);
\t\t\t\t\t}),
\t\t\t\t);
\t\t\t}

\t\t\tactions.replaceChildren(...nextActions);
\t\t};

\t\twindow.addEventListener(stateEventName, render);
\t\tdocument.addEventListener("astro:after-swap", render);
\t\tapp.onToolbarPlacementUpdated(({ placement }) => {
\t\t\twindowElement.placement = placement;
\t\t});
\t\tapp.onToggled(({ state }) => {
\t\t\tif (state) {
\t\t\t\trender();
\t\t\t}
\t\t});

\t\trender();
\t},
});
`;

export const buildNodeAdminBarMiddlewareSource = (
	configImportPath: string,
	runtimeAdapterImportPath: string,
	databaseAdapterImportPath: string,
	adminBarOptions: {
		disable: boolean;
	},
): string => {
	const runtimeAdapterErrorMessage = JSON.stringify(
		`Lucid Astro could not load the runtime adapter export from "${runtimeAdapterImportPath}".`,
	);

	return `import { defineMiddleware } from "astro:middleware";
import * as lucidConfigModule from ${JSON.stringify(configImportPath)};
import ConfiguredDatabaseAdapter from ${JSON.stringify(databaseAdapterImportPath)};
import { createApp, createConfiguredDatabaseAdapter, processConfig } from "@lucidcms/core/runtime";
import { getRuntimeContext } from "@lucidcms/node-adapter/runtime";
import { maybeInjectLucidAdminBar } from "@lucidcms/astro/runtime";
import configureLucid from ${JSON.stringify(astroConstants.integration.configureLucidModuleId)};
import emailTemplates from "./${astroConstants.files.emailTemplatesModule}";

const adminBarOptions = ${JSON.stringify(adminBarOptions, null, 2)};

let appPromise;
let runtimeAdapterModulePromise;

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

const loadRuntimeAdapterModule = async () => {
\tif (!runtimeAdapterModulePromise) {
\t\truntimeAdapterModulePromise = import(${JSON.stringify(runtimeAdapterImportPath)});
\t}

\treturn runtimeAdapterModulePromise;
};

const getAdapterFactory = async () => {
\tconst runtimeAdapterModule = await loadRuntimeAdapterModule();
\tconst adapterFactory =
\t\truntimeAdapterModule.adapter ??
\t\truntimeAdapterModule.default;

\tif (typeof adapterFactory !== "function") {
\t\tthrow new Error(${runtimeAdapterErrorMessage});
\t}

\treturn adapterFactory;
};

const resolveRemoteAddress = (request) => {
\tconst forwardedFor = request.headers.get("x-forwarded-for");
\tconst firstForwardedAddress = forwardedFor?.split(",")[0]?.trim();
\treturn (
\t\tfirstForwardedAddress ||
\t\trequest.headers.get("x-real-ip") ||
\t\trequest.headers.get("cf-connecting-ip") ||
\t\t${JSON.stringify(astroConstants.defaults.remoteAddress)}
\t);
};

const ensureApp = async () => {
\tif (!appPromise) {
\t\tappPromise = (async () => {
\t\t\tconst wrappedDefinition = configureLucid(lucidConfigModule.default, {
\t\t\t\temailTemplates,
\t\t\t});
\t\t\tconst adapterFactory = await getAdapterFactory();
\t\t\tconst adapter = await adapterFactory(wrappedDefinition.adapter.options);
\t\t\tconst env = adapter.getEnvVars
\t\t\t\t? await adapter.getEnvVars({
\t\t\t\t\tlogger: silentLogger,
\t\t\t\t})
\t\t\t\t: undefined;

\t\t\tif (lucidConfigModule.env && env) {
\t\t\t\tlucidConfigModule.env.parse(env);
\t\t\t}

\t\t\tconst databaseAdapter = createConfiguredDatabaseAdapter(
\t\t\t\tConfiguredDatabaseAdapter,
\t\t\t\twrappedDefinition.database,
\t\t\t\tenv,
\t\t\t);
\t\t\tconst resolvedConfig = await processConfig(wrappedDefinition.config(env || {}), {
\t\t\t\trecipe: wrappedDefinition.recipe,
\t\t\t\tresolvedDb: databaseAdapter,
\t\t\t\tskipValidation: true,
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

export const onRequest = defineMiddleware(async (context, next) => {
\tconst response = await next();
\treturn maybeInjectLucidAdminBar({
\t\tcontext,
\t\tresponse,
\t\toptions: adminBarOptions,
\t\tisDev: import.meta.env.DEV,
\t\tappFetch: async (request) => {
\t\t\tconst { app } = await ensureApp();
\t\t\treturn app.fetch(request);
\t\t},
\t});
});
`;
};

export const buildCloudflareAdminBarMiddlewareSource = (
	configImportPath: string,
	databaseAdapterImportPath: string,
	adminBarOptions: {
		disable: boolean;
	},
): string => `import { defineMiddleware } from "astro:middleware";
import { maybeInjectLucidAdminBar } from "@lucidcms/astro/runtime";

const adminBarOptions = ${JSON.stringify(adminBarOptions, null, 2)};

let appPromise;
let runtimeModulesPromise;

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

const loadRuntimeModules = async () => {
\tif (!runtimeModulesPromise) {
\t\truntimeModulesPromise = Promise.all([
\t\t\timport(${JSON.stringify(configImportPath)}),
\t\t\timport("@lucidcms/core/runtime"),
\t\t\timport(${JSON.stringify(databaseAdapterImportPath)}),
\t\t\timport(${JSON.stringify(astroConstants.integration.configureLucidModuleId)}),
\t\t\timport("@lucidcms/cloudflare-adapter/runtime"),
\t\t\timport("./${astroConstants.files.emailTemplatesModule}"),
\t\t]).then(
\t\t\t([
\t\t\t\tlucidConfigModule,
\t\t\t\truntimeModule,
\t\t\t\tdatabaseAdapterModule,
\t\t\t\tconfigureLucidModule,
\t\t\t\truntimeContextModule,
\t\t\t\temailTemplatesModule,
\t\t\t]) => ({
\t\t\t\tdefinition: lucidConfigModule.default,
\t\t\t\tenvSchema: lucidConfigModule.env,
\t\t\t\tcreateApp: runtimeModule.createApp,
\t\t\t\tcreateConfiguredDatabaseAdapter:
\t\t\t\t\truntimeModule.createConfiguredDatabaseAdapter,
\t\t\t\tDatabaseAdapterClass: databaseAdapterModule.default,
\t\t\t\tprocessConfig: runtimeModule.processConfig,
\t\t\t\tconfigureLucid: configureLucidModule.default,
\t\t\t\tgetRuntimeContext: runtimeContextModule.getRuntimeContext,
\t\t\t\temailTemplates: emailTemplatesModule.default,
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
\t\t\t\tcreateApp,
\t\t\t\tcreateConfiguredDatabaseAdapter,
\t\t\t\tDatabaseAdapterClass,
\t\t\t\tprocessConfig,
\t\t\t\tconfigureLucid,
\t\t\t\tgetRuntimeContext,
\t\t\t\temailTemplates,
\t\t\t} = await loadRuntimeModules();

\t\t\tif (envSchema) {
\t\t\t\tenvSchema.parse(cloudflareEnv);
\t\t\t}

\t\t\tconst wrappedDefinition = configureLucid(definition, {
\t\t\t\temailTemplates,
\t\t\t});
\t\t\tconst databaseAdapter = createConfiguredDatabaseAdapter(
\t\t\t\tDatabaseAdapterClass,
\t\t\t\twrappedDefinition.database,
\t\t\t\tcloudflareEnv,
\t\t\t);
\t\t\tconst resolvedConfig = await processConfig(wrappedDefinition.config(cloudflareEnv), {
\t\t\t\trecipe: wrappedDefinition.recipe,
\t\t\t\tresolvedDb: databaseAdapter,
\t\t\t\tskipValidation: true,
\t\t\t});

\t\t\treturn createApp({
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
\t\t\t\t\t\t\t\tlet executionContext = null;
\t\t\t\t\t\t\t\ttry {
\t\t\t\t\t\t\t\t\texecutionContext = c.executionCtx ?? null;
\t\t\t\t\t\t\t\t} catch {}
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

export const onRequest = defineMiddleware(async (context, next) => {
\tconst response = await next();
\treturn maybeInjectLucidAdminBar({
\t\tcontext,
\t\tresponse,
\t\toptions: adminBarOptions,
\t\tisDev: import.meta.env.DEV,
\t\tappFetch: async (request) => {
\t\t\tconst cloudflareEnv = getCloudflareEnv();
\t\t\tconst { app } = await ensureApp();
\t\t\treturn app.fetch(
\t\t\t\trequest,
\t\t\t\tcloudflareEnv,
\t\t\t\tcontext.locals?.cfContext ?? undefined,
\t\t\t);
\t\t},
\t});
});
`;
