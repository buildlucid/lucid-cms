import { destroyRuntimeHosts } from "../internal/runtime.js";
import type { ResolvedLucidProject } from "./project.js";

type DevSignal = "SIGINT" | "SIGTERM";

type DevLifecycleProcess = Pick<
	NodeJS.Process,
	"exit" | "exitCode" | "prependListener" | "removeListener"
>;

type DevServer = {
	close(): void | Promise<void>;
};

type DevLifecycleLogger = {
	error(message: string): void;
};

type DevServerLifecycleOptions = {
	logger?: DevLifecycleLogger;
	onShutdown?: () => void;
	runtimeProcess?: DevLifecycleProcess;
};

const devLifecycleRegistrySymbol = Symbol.for("@lucidcms/astro:dev-lifecycles");
const globalState = globalThis as typeof globalThis & {
	[devLifecycleRegistrySymbol]?: Map<string, DevServerLifecycle>;
};
let devLifecycleRegistry = globalState[devLifecycleRegistrySymbol];
if (!devLifecycleRegistry) {
	devLifecycleRegistry = new Map();
	globalState[devLifecycleRegistrySymbol] = devLifecycleRegistry;
}

const signalExitCodes: Record<DevSignal, number> = {
	SIGINT: 130,
	SIGTERM: 143,
};

/** Releases resources owned by the runtime-specific Astro integration. */
export const teardownProject = async (
	project: ResolvedLucidProject,
	command: "dev" | "build" | "sync",
) => {
	await project.integrationBridge.teardown?.({
		adapter: project.loaded.adapter,
		command,
	});
};

/** Releases both generated Lucid hosts and runtime-specific dev resources. */
export const teardownDevProject = async (project: ResolvedLucidProject) => {
	try {
		await destroyRuntimeHosts(project.hostId);
	} finally {
		await teardownProject(project, "dev");
	}
};

const throwTeardownErrors = (results: PromiseSettledResult<unknown>[]) => {
	const errors = results.flatMap((result) =>
		result.status === "rejected" ? [result.reason] : [],
	);
	if (errors.length === 1) throw errors[0];
	if (errors.length > 1) {
		throw new AggregateError(errors, "Lucid Astro dev teardown failed.");
	}
};

/** Owns process signals and every resource associated with one Astro dev server. */
export const createDevServerLifecycle = (
	options: DevServerLifecycleOptions = {},
) => {
	const runtimeProcess = options.runtimeProcess ?? process;
	const trackedProjects = new Set<ResolvedLucidProject>();
	const projectTeardowns = new WeakMap<ResolvedLucidProject, Promise<void>>();
	let activeProject: ResolvedLucidProject | undefined;
	let server: DevServer | undefined;
	let logger = options.logger;
	let registered = false;
	let shutdownPromise: Promise<void> | undefined;
	let signalShutdownPromise: Promise<void> | undefined;

	const teardownTrackedProject = (project: ResolvedLucidProject) => {
		let teardown = projectTeardowns.get(project);
		if (!teardown) {
			trackedProjects.delete(project);
			if (activeProject === project) activeProject = undefined;
			teardown = teardownDevProject(project);
			projectTeardowns.set(project, teardown);
		}
		return teardown;
	};

	const unregister = () => {
		if (!registered) return;
		registered = false;
		runtimeProcess.removeListener("SIGINT", onSignal);
		runtimeProcess.removeListener("SIGTERM", onSignal);
	};

	const shutdown = () => {
		shutdownPromise ??= (async () => {
			const projects = Array.from(trackedProjects);
			const currentServer = server;
			server = undefined;
			const results = await Promise.allSettled([
				...projects.map(teardownTrackedProject),
				...(currentServer
					? [Promise.resolve().then(() => currentServer.close())]
					: []),
			]);
			unregister();
			options.onShutdown?.();
			throwTeardownErrors(results);
		})();
		return shutdownPromise;
	};

	function onSignal(signal: NodeJS.Signals) {
		if (signal !== "SIGINT" && signal !== "SIGTERM") return;
		if (signalShutdownPromise) return;

		const exitCode = signalExitCodes[signal];
		const originalExit = runtimeProcess.exit;
		// Miniflare exits synchronously from its own signal listener. Defer that
		// public process operation just for this shutdown so later listeners cannot
		// interrupt Lucid and Vite cleanup; no third-party listener is removed.
		const deferredExit = (() => undefined as never) as NodeJS.Process["exit"];
		runtimeProcess.exitCode = exitCode;
		runtimeProcess.exit = deferredExit;

		signalShutdownPromise = shutdown()
			.catch((error) => {
				logger?.error(
					`Lucid Astro dev teardown failed: ${error instanceof Error ? error.message : String(error)}`,
				);
			})
			.finally(() => {
				if (runtimeProcess.exit === deferredExit) {
					runtimeProcess.exit = originalExit;
				}
				originalExit.call(runtimeProcess, exitCode);
			});
	}

	return {
		activateProject: async (project: ResolvedLucidProject) => {
			const previous = activeProject;
			trackedProjects.add(project);
			activeProject = project;
			if (previous && previous !== project) {
				await teardownTrackedProject(previous);
			}
		},
		hasActiveProject: () => activeProject !== undefined,
		register: () => {
			if (registered) return;
			registered = true;
			runtimeProcess.prependListener("SIGINT", onSignal);
			runtimeProcess.prependListener("SIGTERM", onSignal);
		},
		releaseProject: teardownTrackedProject,
		setLogger: (nextLogger: DevLifecycleLogger) => {
			logger = nextLogger;
		},
		setServer: (nextServer: DevServer) => {
			server = nextServer;
		},
		shutdown,
		trackProject: (project: ResolvedLucidProject) => {
			trackedProjects.add(project);
		},
	};
};

export type DevServerLifecycle = ReturnType<typeof createDevServerLifecycle>;

/** Returns the process-wide lifecycle retained across Astro/Vite config restarts. */
export const getDevServerLifecycle = (
	key: string,
	logger: DevLifecycleLogger,
) => {
	const existing = devLifecycleRegistry.get(key);
	if (existing) {
		existing.setLogger(logger);
		return existing;
	}

	const lifecycle = createDevServerLifecycle({
		logger,
		onShutdown: () => {
			if (devLifecycleRegistry.get(key) === lifecycle) {
				devLifecycleRegistry.delete(key);
			}
		},
	});
	devLifecycleRegistry.set(key, lifecycle);
	return lifecycle;
};
