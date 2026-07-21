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
import { createLucidSpaResponse, destroyRuntimeHostRevision, getBuildContext, getRuntimeHostState, shouldServeLucidSpaShell } from "@lucidcms/astro/internal/runtime";
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
	const runtimeKey = state.cacheKey ?? "default";
	let hostPromise = projectState.hosts.get(runtimeKey);
	if (!hostPromise) {
		hostPromise = createLucidHost({
			definition: { runtime: adapter, db, config: configFactory },
			envSchema,
			env: state.env,
			runtimeContext: state.runtimeContext,
			translationBundles,
			meta: { emailTemplates, host: "astro" },
			http: state.http,
		}).catch((error) => {
			projectState.hosts.delete(runtimeKey);
			throw error;
		});
		projectState.hosts.set(runtimeKey, hostPromise);
	}
	const host = await hostPromise;
	if (projectState.invalidated) {
		await host.destroy();
		throw new Error("The Lucid Astro host was invalidated during reload.");
	}
	return { host, state };
};

export const destroyLucidHosts = async () => {
	await destroyRuntimeHostRevision(hostKey, projectState);
};

if (import.meta.hot) import.meta.hot.dispose(destroyLucidHosts);

export const handle = async (context) => {
	const { host, state } = await getLucidHost(context);
	const response = await bridge.handle({ host, context, state });
	const pathname = new URL(context.request.url).pathname;
	return response.status === 404 && shouldServeLucidSpaShell(pathname, context.request.method)
		? createLucidSpaResponse(spaHtml, context.request.method)
		: response;
};

export const getToolkit = async (options = {}) => {
	const { host } = await getLucidHost(options.context);
	return host.getToolkit(options.request);
};

export default getToolkit;
`;
};

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
	]);

	return { routePath, runtimePath };
};
