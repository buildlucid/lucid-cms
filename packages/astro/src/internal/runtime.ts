import { withResponseCleanup } from "@lucidcms/core/runtime";
import type { EnvironmentVariables } from "@lucidcms/core/types";
import constants from "../constants.js";

export { withResponseCleanup };

const buildContextsSymbol = Symbol.for("@lucidcms/astro:build-contexts");
const runtimeHostsSymbol = Symbol.for("@lucidcms/astro:hosts");
const invocationsSymbol = Symbol.for("@lucidcms/astro:invocations");
type RuntimeHost = {
	destroy(): void | Promise<void>;
};
type RuntimeInvocation = {
	destroy(): void | Promise<void>;
};
type HostCreation = {
	startedAt: number;
	error?: unknown;
};
type RuntimeHostState = {
	revision: string;
	hosts: Map<unknown, RuntimeHost>;
	creations: Map<unknown, HostCreation>;
	invalidated: boolean;
	ready: Promise<void>;
	destroyed?: Promise<void>;
};
type InvocationState = {
	invocations: Map<unknown, Promise<RuntimeInvocation>>;
};
type InvocationLocals = {
	[invocationsSymbol]?: Map<string, InvocationState>;
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
		hosts.map((host) => host.destroy()),
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
		creations: new Map(),
		invalidated: false,
		ready: previous ? destroyRuntimeHostState(previous) : Promise.resolve(),
	};
	runtimeHosts.set(hostKey, state);
	return state;
};

/**
 * Returns a completed runtime host without sharing an I/O-bearing pending
 * promise between Worker requests. Concurrent cold requests poll the completed
 * host state while the creating request owns and optionally anchors its work.
 */
export const getOrCreateRuntimeHost = async <Host extends RuntimeHost>(
	state: RuntimeHostState,
	key: unknown,
	create: () => Host | Promise<Host>,
	anchor?: (promise: Promise<unknown>) => void,
): Promise<Host> => {
	const existing = state.hosts.get(key);
	if (existing) return existing as Host;

	let creation = state.creations.get(key);
	if (!creation) {
		creation = { startedAt: Date.now() };
		state.creations.set(key, creation);
		const currentCreation = creation;
		const task = Promise.resolve()
			.then(create)
			.then(async (host) => {
				if (state.invalidated) {
					await host.destroy();
					throw new Error(
						"Lucid runtime host was invalidated during initialization.",
					);
				}
				const initialized = state.hosts.get(key);
				if (initialized) {
					await host.destroy();
					return initialized as Host;
				}
				state.hosts.set(key, host);
				state.creations.delete(key);
				return host;
			})
			.catch((error) => {
				currentCreation.error = error;
				if (state.creations.get(key) === currentCreation) {
					state.creations.delete(key);
				}
				throw error;
			});

		try {
			anchor?.(task);
		} catch {
			// The creating request still owns and awaits the task when anchoring is
			// unavailable, such as during local Node development.
		}
		return task;
	}

	const deadline = creation.startedAt + 30_000;
	let pollDelay = 1;
	while (Date.now() < deadline) {
		const initialized = state.hosts.get(key);
		if (initialized) return initialized as Host;
		if (creation.error !== undefined) {
			if (state.creations.get(key) === creation) {
				state.creations.delete(key);
			}
			throw creation.error;
		}
		await new Promise((resolve) => setTimeout(resolve, pollDelay));
		pollDelay = Math.min(pollDelay * 2, 25);
	}

	if (state.creations.get(key) === creation) {
		state.creations.delete(key);
	}
	return getOrCreateRuntimeHost(state, key, create, anchor);
};

/**
 * Returns an invocation cache owned by one Astro request. The cache lives
 * directly on `Astro.locals`, so live resources never enter module state.
 */
export const getInvocationStore = (
	locals: object,
	hostKey: string,
	revision: string,
) => {
	const target = locals as InvocationLocals;
	let projectStates = target[invocationsSymbol];
	if (!projectStates) {
		projectStates = new Map();
		Object.defineProperty(target, invocationsSymbol, {
			value: projectStates,
		});
	}

	const projectRevisionKey = JSON.stringify([hostKey, revision]);
	const current = projectStates.get(projectRevisionKey);
	if (current) return current.invocations;

	const invocations = new Map<unknown, Promise<RuntimeInvocation>>();
	projectStates.set(projectRevisionKey, { invocations });
	return invocations;
};

/** Creates or reuses one invocation within the current Astro request. */
export const getOrCreateInvocation = async <
	Invocation extends RuntimeInvocation,
>(
	locals: object,
	hostKey: string,
	revision: string,
	key: unknown,
	create: () => Invocation | Promise<Invocation>,
): Promise<Invocation> => {
	const invocations = getInvocationStore(locals, hostKey, revision);
	let invocationPromise = invocations.get(key) as
		| Promise<Invocation>
		| undefined;
	if (!invocationPromise) {
		invocationPromise = Promise.resolve()
			.then(create)
			.catch((error) => {
				invocations.delete(key);
				throw error;
			});
		invocations.set(key, invocationPromise);
	}
	return invocationPromise;
};

/** Returns whether the current Astro request created any Lucid invocations. */
export const hasInvocationScopes = (locals: object) => {
	const projectStates = (locals as InvocationLocals)[invocationsSymbol];
	return projectStates !== undefined && projectStates.size > 0;
};

/** Destroys every live Lucid invocation created during one Astro request. */
export const destroyInvocationScopes = async (locals: object) => {
	const projectStates = (locals as InvocationLocals)[invocationsSymbol];
	if (!projectStates) return;
	const invocations = Array.from(projectStates.values()).flatMap((state) =>
		Array.from(state.invocations.values()),
	);
	projectStates.clear();
	await Promise.allSettled(
		invocations.map(async (invocation) => (await invocation).destroy()),
	);
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
