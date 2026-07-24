import { createHash } from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import {
	getConfigArtifactImportPaths,
	prepareConfigArtifacts,
} from "@lucidcms/core/build";
import constants from "../constants.js";
import { ensureDirectory } from "./filesystem.js";
import type { ResolvedLucidProject } from "./project.js";

const moduleSource = (value: unknown, name: string) =>
	`const ${name} = ${JSON.stringify(value, null, 2)};\nexport default ${name};\n`;

/** Creates a stable revision from the generated host inputs. */
const createProjectRevision = async (files: string[], sources: string[]) => {
	const hash = createHash("sha256");
	for (const filePath of Array.from(new Set(files)).sort()) {
		hash.update(filePath);
		hash.update(await fs.readFile(filePath));
	}
	for (const source of sources) hash.update(source);
	return hash.digest("hex").slice(0, 16);
};

const buildRuntimeSource = (props: {
	project: ResolvedLucidProject;
	buildContextId: string;
	compiled: boolean;
	revision: string;
}) => {
	const imports = getConfigArtifactImportPaths(".");
	return `import configFactory from ${JSON.stringify(imports.config)};
import { env as envSchema } from ${JSON.stringify(imports.env)};
import db from ${JSON.stringify(imports.db)};
import runtime from ${JSON.stringify(imports.runtime)};
import bridge from ${JSON.stringify(props.project.bridgeEntrypoint)};
import { createLucidHost } from "@lucidcms/core/runtime";
import { createLucidSpaResponse, destroyRuntimeHostRevision, getBuildContext, getOrCreateInvocation, getOrCreateRuntimeHost, getRuntimeHostState, shouldServeLucidSpaShell } from "@lucidcms/astro/internal/runtime";
import emailTemplates from "./${constants.files.emailTemplates}";
import translationBundles from "./${constants.files.translations}";
import spaHtml from "./${constants.files.spa}";

const hostKey = ${JSON.stringify(props.project.hostId)};
const revision = ${JSON.stringify(props.revision)};
const projectState = getRuntimeHostState(hostKey, revision);

const resolveAdapter = async () => {
	const value = typeof runtime === "function" ? runtime() : runtime;
	const adapter = await value;
	if (!adapter || typeof adapter !== "object") {
		throw new Error("Lucid could not resolve the configured runtime adapter.");
	}
	return adapter;
};

const createHost = (adapter, state) => createLucidHost({
	definition: { runtime: adapter, db, config: configFactory },
	envSchema,
	env: state.env,
	runtimeContext: state.runtimeContext,
	translationBundles,
	meta: { emailTemplates, host: "astro" },
	http: state.http,
	databaseScope: state.databaseScope,
});

export const getLucidHost = async (context) => {
	await projectState.ready;
	if (projectState.invalidated) {
		throw new Error("The Lucid Astro host was invalidated during reload.");
	}
	const adapter = await resolveAdapter();
	const state = await bridge.resolveRuntime({
		adapter,
		context,
		fallbackEnv: getBuildContext(${JSON.stringify(props.buildContextId)}),
		compiled: ${JSON.stringify(props.compiled)},
	});
	if (state.databaseScope !== "runtime" && state.databaseScope !== "invocation") {
		throw new Error("The Lucid Astro runtime returned an invalid database scope.");
	}
	const runtimeKey = state.cacheKey ?? "default";
	const executionContext = state.executionContext;
	const anchor = executionContext && typeof executionContext.waitUntil === "function"
		? (promise) => executionContext.waitUntil(promise)
		: undefined;
	const host = await getOrCreateRuntimeHost(
		projectState,
		runtimeKey,
		() => createHost(adapter, state),
		anchor,
	);
	if (projectState.invalidated) {
		await host.destroy();
		throw new Error("The Lucid Astro host was invalidated during reload.");
	}
	return { host, state, runtimeKey };
};

export const createLucidInvocation = async (context) => {
	const { host, state } = await getLucidHost(context);
	return {
		invocation: host.createInvocation({ env: state.env }),
		state,
	};
};

export const getLucidInvocation = async (context) => {
	if (!context?.locals || typeof context.locals !== "object") {
		throw new Error("Lucid Astro request APIs require the current Astro context.");
	}
	const { host, state, runtimeKey } = await getLucidHost(context);
	const invocation = await getOrCreateInvocation(
		context.locals,
		hostKey,
		revision,
		runtimeKey,
		() => host.createInvocation({ env: state.env }),
	);
	return { invocation, state };
};

export const destroyLucidHosts = async () => {
	await destroyRuntimeHostRevision(hostKey, projectState);
};

if (import.meta.hot) import.meta.hot.dispose(destroyLucidHosts);

export const handle = async (context) => {
	const { invocation, state } = await getLucidInvocation(context);
	const response = await bridge.handle({ invocation, context, state });
	const pathname = new URL(context.request.url).pathname;
	return response.status === 404 && shouldServeLucidSpaShell(pathname, context.request.method)
		? createLucidSpaResponse(spaHtml, context.request.method)
		: response;
};

export const getToolkit = async (context) => {
	const { invocation } = await getLucidInvocation(context);
	return invocation.getToolkit(context.request);
};

export default getToolkit;
`;
};

const buildMiddlewareSource =
	() => `import { defineMiddleware } from "astro:middleware";
import { destroyInvocationScopes, hasInvocationScopes, withResponseCleanup } from "@lucidcms/astro/internal/runtime";

export const onRequest = defineMiddleware(async (context, next) => {
	try {
		const response = await next();
		if (!hasInvocationScopes(context.locals)) return response;
		return withResponseCleanup(response, () =>
			destroyInvocationScopes(context.locals),
		);
	} catch (error) {
		await destroyInvocationScopes(context.locals);
		throw error;
	}
});
`;

/** Writes the generated Astro route, runtime and serialized Lucid modules. */
export const writeGeneratedModules = async (props: {
	project: ResolvedLucidProject;
	directory: string;
	buildContextId: string;
	compiled: boolean;
}) => {
	await ensureDirectory(props.directory);
	const configArtifacts = await prepareConfigArtifacts({
		configPath: props.project.configPath,
		outputPath: props.directory,
	});
	const spaHtml = await fs.readFile(
		path.join(
			props.directory,
			constants.assetDirectory,
			constants.mountPath.slice(1),
			constants.files.index,
		),
		"utf-8",
	);
	const emailTemplatesSource = moduleSource(
		props.project.emailTemplates,
		"emailTemplates",
	);
	const translationsSource = moduleSource(
		props.project.loaded.translationStore.bundles,
		"translationBundles",
	);
	const spaSource = moduleSource(spaHtml, "spaHtml");
	const revision = await createProjectRevision(
		[
			props.project.configPath,
			...props.project.loaded.configDependencies,
			...Object.values(configArtifacts),
		],
		[emailTemplatesSource, translationsSource, spaSource],
	);
	const routePath = path.join(props.directory, constants.files.route);
	const runtimePath = path.join(props.directory, constants.files.runtime);
	const middlewarePath = path.join(props.directory, constants.files.middleware);

	await Promise.all([
		fs.writeFile(
			path.join(props.directory, constants.files.emailTemplates),
			emailTemplatesSource,
		),
		fs.writeFile(
			path.join(props.directory, constants.files.translations),
			translationsSource,
		),
		fs.writeFile(path.join(props.directory, constants.files.spa), spaSource),
		fs.writeFile(
			routePath,
			`export { handle as ALL } from "./${constants.files.runtime}";\nexport const prerender = false;\n`,
		),
		fs.writeFile(
			runtimePath,
			buildRuntimeSource({
				project: props.project,
				buildContextId: props.buildContextId,
				compiled: props.compiled,
				revision,
			}),
		),
		fs.writeFile(middlewarePath, buildMiddlewareSource()),
	]);

	return { middlewarePath, routePath, runtimePath };
};
