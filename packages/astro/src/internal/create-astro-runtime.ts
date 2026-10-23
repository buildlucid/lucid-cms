import {
	createAdminDocumentExtension,
	createLucidHost,
	handleDevTask,
	LucidError,
} from "@lucidcms/core/runtime";
import type { LucidBuild, Toolkit } from "@lucidcms/core/types";
import { astroHost } from "../host.js";
import type { LucidAstroBridge, LucidAstroContext } from "../types.js";
import {
	destroyRuntimeHostRevision,
	getOrCreateInvocation,
	getOrCreateRuntimeHost,
	getRuntimeHostState,
} from "./runtime.js";

/** What the runtime bridge reads from an Astro request: the platform's context, such as Cloudflare's bindings. */
type AstroRuntimeContext = {
	request: Request;
	locals?: object;
};

/** Checks for a platform execution context that keeps background work alive, such as a Worker's. */
const hasWaitUntil = (
	value: unknown,
): value is { waitUntil(promise: Promise<unknown>): void } =>
	typeof value === "object" &&
	value !== null &&
	"waitUntil" in value &&
	typeof value.waitUntil === "function";

/** Serves Lucid inside Astro via `lucid:build` and the runtime bridge, caching hosts per runtime until reload, storing each request's invocation on `locals` and handling development tasks and the admin document. */
const createAstroRuntime = (props: {
	build: LucidBuild;
	bridge: LucidAstroBridge;
	/** Identifies the project across reloads. */
	hostKey: string;
}) => {
	const { build, bridge, hostKey } = props;
	const compiled = build.dev === undefined;

	// Workers don't allow random values while a module loads, so the revision is made on first use.
	let projectState: ReturnType<typeof getRuntimeHostState> | undefined;
	const getProjectState = () => {
		projectState ??= getRuntimeHostState(hostKey, crypto.randomUUID());
		return projectState;
	};

	const getLucidHost = async (context?: unknown) => {
		const hostState = getProjectState();
		await hostState.ready;
		if (hostState.invalidated) {
			throw new LucidError({
				message: "The Lucid Astro host was invalidated during reload.",
			});
		}

		const state = await bridge.resolveRuntime({ context, compiled });
		const runtimeKey = state.cacheKey ?? "default";
		const executionContext = state.executionContext;
		const anchor = hasWaitUntil(executionContext)
			? (promise: Promise<unknown>) => executionContext.waitUntil(promise)
			: undefined;

		const host = await getOrCreateRuntimeHost(
			hostState,
			runtimeKey,
			() =>
				createLucidHost({
					...build.host,
					definition: {
						...build.host.definition,
						// Astro renders the website on the CMS's own domain unless the project says otherwise.
						configure: (draft) => {
							draft.urls.site ??= "/";
							build.host.definition.configure?.(draft);
						},
					},
					meta: { ...build.host.meta, host: astroHost.key },
					env: state.env,
					runtimeContext: {
						...state.runtimeContext,
						pluginModules: build.pluginModules,
					},
					databaseScope: state.databaseScope,
					http: {
						extensions: [
							...(state.http?.extensions ?? []),
							...(build.admin
								? [createAdminDocumentExtension(build.admin.html)]
								: []),
						],
					},
				}),
			anchor,
		);
		if (hostState.invalidated) {
			await host.destroy();
			throw new LucidError({
				message: "The Lucid Astro host was invalidated during reload.",
			});
		}

		return { host, state, runtimeKey };
	};

	/** Creates an invocation the caller owns, such as for Worker events outside a request. */
	const createLucidInvocation = async (context?: unknown) => {
		const { host, state } = await getLucidHost(context);
		return { invocation: host.createInvocation({ env: state.env }), state };
	};

	/** Creates or reuses the current Astro request's invocation, which its middleware destroys. */
	const getLucidInvocation = async (context: AstroRuntimeContext) => {
		if (!context.locals || typeof context.locals !== "object") {
			throw new LucidError({
				message: "Lucid Astro request APIs require the current Astro context.",
			});
		}

		const { host, state, runtimeKey } = await getLucidHost(context);
		const invocation = await getOrCreateInvocation(
			context.locals,
			hostKey,
			getProjectState().revision,
			runtimeKey,
			() => host.createInvocation({ env: state.env }),
		);

		return { invocation, state };
	};

	return {
		createLucidInvocation,
		/** Serves an Astro request with Lucid, running development tasks first. */
		handle: async (context: AstroRuntimeContext) => {
			if (build.dev) {
				const { host, state } = await getLucidHost(context);
				const task = await handleDevTask({
					request: context.request,
					host,
					dev: build.dev,
					env: state.env,
				});
				if (task) return task;
			}

			const { invocation, state } = await getLucidInvocation(context);
			return bridge.handle({ invocation, context, state });
		},
		/** The toolkit for the current Astro request, which `@lucidcms/astro/toolkit` resolves to. */
		getToolkit: async (context: LucidAstroContext): Promise<Toolkit> => {
			const { invocation } = await getLucidInvocation(context);
			return invocation.getToolkit(context.request);
		},
		/** Destroys the hosts this module created, such as when Vite replaces it. */
		destroy: async () => {
			if (projectState) await destroyRuntimeHostRevision(hostKey, projectState);
		},
	};
};

export default createAstroRuntime;
