import type { EnvironmentVariables } from "@lucidcms/core/types";
import constants from "../constants.js";

const buildContextsSymbol = Symbol.for("@lucidcms/astro:build-contexts");
const runtimeHostsSymbol = Symbol.for("@lucidcms/astro:hosts");
type RuntimeHost = {
	destroy(): void | Promise<void>;
};
type RuntimeHostState = {
	revision: string;
	hosts: Map<unknown, Promise<RuntimeHost>>;
	invalidated: boolean;
	ready: Promise<void>;
	destroyed?: Promise<void>;
};
const globalState = globalThis as typeof globalThis & {
	[buildContextsSymbol]?: Map<string, EnvironmentVariables | undefined>;
	[runtimeHostsSymbol]?: Map<string, RuntimeHostState>;
};
let buildContexts = globalState[buildContextsSymbol];
if (!buildContexts) {
	buildContexts = new Map();
	globalState[buildContextsSymbol] = buildContexts;
}
let runtimeHosts = globalState[runtimeHostsSymbol];
if (!runtimeHosts) {
	runtimeHosts = new Map();
	globalState[runtimeHostsSymbol] = runtimeHosts;
}

/** Destroys every host held by a runtime revision. */
const destroyRuntimeHostState = (state: RuntimeHostState) => {
	if (state.destroyed) return state.destroyed;
	state.invalidated = true;
	const hosts = Array.from(state.hosts.values());
	state.hosts.clear();
	state.destroyed = Promise.allSettled(
		hosts.map(async (host) => (await host).destroy()),
	).then(() => undefined);
	return state.destroyed;
};

/** Registers environment values for generated modules used during the current build. */
export const registerBuildContext = (
	id: string,
	env: EnvironmentVariables | undefined,
) => {
	buildContexts.set(id, env);
};

/** Returns environment values registered during Astro configuration. */
export const getBuildContext = (id: string) => buildContexts.get(id);

/** Returns the shared host cache for a generated project revision. */
export const getRuntimeHostState = (hostKey: string, revision: string) => {
	const previous = runtimeHosts.get(hostKey);
	if (previous?.revision === revision && !previous.invalidated) return previous;

	const state: RuntimeHostState = {
		revision,
		hosts: new Map(),
		invalidated: false,
		ready: previous ? destroyRuntimeHostState(previous) : Promise.resolve(),
	};
	runtimeHosts.set(hostKey, state);
	return state;
};

/** Destroys one generated host state without invalidating a replacement. */
export const destroyRuntimeHostRevision = async (
	hostKey: string,
	state: RuntimeHostState,
) => {
	if (runtimeHosts.get(hostKey) === state) runtimeHosts.delete(hostKey);
	await destroyRuntimeHostState(state);
};

/** Destroys all hosts owned by a generated Lucid project. */
export const destroyRuntimeHosts = async (hostKey: string) => {
	const state = runtimeHosts.get(hostKey);
	if (!state) return;
	runtimeHosts.delete(hostKey);
	await destroyRuntimeHostState(state);
};

/** Checks whether a missed Lucid route should fall back to the admin shell. */
export const shouldServeLucidSpaShell = (pathname: string, method: string) => {
	if (method !== "GET" && method !== "HEAD") return false;
	if (
		pathname !== constants.mountPath &&
		!pathname.startsWith(`${constants.mountPath}/`)
	) {
		return false;
	}

	return !constants.nonSpaPrefixes.some(
		(prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
	);
};

/** Creates the admin shell response used for client-side Lucid routes. */
export const createLucidSpaResponse = (html: string, method: string) =>
	new Response(method === "HEAD" ? null : html, {
		status: 200,
		headers: {
			"Cache-Control": "no-store",
			"Content-Type": "text/html; charset=utf-8",
		},
	});
