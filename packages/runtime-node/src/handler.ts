import {
	createAdminDocumentExtension,
	createLucidHost,
	handleDevTask,
	handleHostRequest,
	inlineQueueAdapter,
	isDevTaskRequest,
} from "@lucidcms/core/runtime";
import type {
	AdapterRuntimeContext,
	HostedLucid,
	LucidAdapterOverrides,
	LucidBuild,
	LucidHost,
} from "@lucidcms/core/types";
import getRuntimeContext from "./services/runtime-context.js";

/** Handles requests for a server that runs Lucid in-process: Vite's during development or previewing a build, or a host's. */
export type NodeRequestHandler = Omit<HostedLucid, "handle"> & {
	/** Serves a request, with the Node bindings Vite's servers pass for reading connections. */
	handle: (request: Request, requestBindings?: object) => Promise<Response>;
};

/** Creates a lazily started request host with `compiled` for built modules, leaving development tasks in a separate host with inline jobs so configured queues start only after migrations. */
export const createRequestHandler = (
	build: LucidBuild,
	options: {
		compiled: boolean;
		/** Replaces how the runtime reads connections and loads the build, such as for a host's server. */
		runtimeContext?: Pick<
			AdapterRuntimeContext,
			"getConnectionInfo" | "buildModule"
		>;
	},
): NodeRequestHandler => {
	/** Starts a host on first use, and again after a start that failed. */
	const lazyHost = (adapterOverrides?: LucidAdapterOverrides) => {
		let promise: Promise<LucidHost> | undefined;

		return {
			get: () => {
				promise ??= createLucidHost({
					...build.host,
					adapterOverrides,
					runtimeContext: {
						...getRuntimeContext({
							compiled: options.compiled,
							host: build.host.meta.host,
							pluginModules: build.pluginModules,
						}),
						...options.runtimeContext,
					},
					databaseScope: "runtime",
					http: build.admin
						? { extensions: [createAdminDocumentExtension(build.admin.html)] }
						: undefined,
				}).catch((error: unknown) => {
					promise = undefined;
					throw error;
				});

				return promise;
			},
			destroy: async () => {
				const host = await promise?.catch(() => undefined);
				promise = undefined;
				await host?.destroy();
			},
		};
	};

	const host = lazyHost(build.host.adapterOverrides);
	const taskHost = lazyHost({
		...build.host.adapterOverrides,
		queue: inlineQueueAdapter(),
	});

	return {
		handle: async (request, requestBindings) => {
			if (build.dev && isDevTaskRequest(request, build.dev)) {
				const task = await handleDevTask({
					request,
					host: await taskHost.get(),
					dev: build.dev,
				});
				if (task) return task;
			}

			return handleHostRequest(await host.get(), { request, requestBindings });
		},
		createInvocation: async () => (await host.get()).createInvocation(),
		destroy: async () => {
			await Promise.all([host.destroy(), taskHost.destroy()]);
		},
	};
};
