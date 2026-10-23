import {
	createAdminDocumentExtension,
	createLucidHost,
	handleDevTask,
	handleHostRequest,
	inlineQueueAdapter,
	isDevTaskRequest,
} from "@lucidcms/core/runtime";
import type {
	LucidAdapterOverrides,
	LucidBuild,
	LucidHost,
} from "@lucidcms/core/types";
import getRuntimeContext from "./services/runtime-context.js";

/** Handles requests for a Vite server that runs Lucid in-process, during development or previewing a build. */
export type NodeRequestHandler = {
	fetch: (request: Request, requestBindings?: object) => Promise<Response>;
	/** Destroys the host, such as when the project changes and Vite reloads the server environment. */
	destroy: () => Promise<void>;
};

/** Creates a lazily started Vite request host with `compiled` for built modules, leaving development tasks in a separate host with inline jobs so configured queues start only after migrations. */
export const createRequestHandler = (
	build: LucidBuild,
	options: { compiled: boolean },
): NodeRequestHandler => {
	/** Starts a host on first use, and again after a start that failed. */
	const lazyHost = (adapterOverrides?: LucidAdapterOverrides) => {
		let promise: Promise<LucidHost> | undefined;

		return {
			get: () => {
				promise ??= createLucidHost({
					...build.host,
					adapterOverrides,
					runtimeContext: getRuntimeContext({
						compiled: options.compiled,
						pluginModules: build.pluginModules,
					}),
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
		fetch: async (request, requestBindings) => {
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
		destroy: async () => {
			await Promise.all([host.destroy(), taskHost.destroy()]);
		},
	};
};
