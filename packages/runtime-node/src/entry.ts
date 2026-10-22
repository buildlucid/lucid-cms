import { serve } from "@hono/node-server";
import {
	createLucidHost,
	logger,
	withResponseCleanup,
} from "@lucidcms/core/runtime";
import type { LucidBuild } from "@lucidcms/core/types";
import createNodeJobScheduler from "./services/create-node-job-scheduler.js";
import getRuntimeContext from "./services/runtime-context.js";
import type { NodeRuntimeAdapter } from "./types.js";

/** Starts the built Lucid server and job scheduler from the generated entry, stopping both on `SIGINT` or `SIGTERM`. */
export const startServer = async (build: LucidBuild) => {
	let destroyRuntime = async () => {};

	try {
		const { runtime } = build.host.definition;
		// Resolved once so the host and the server options share an instance. Node entries only run node() builds.
		const adapter = (await (typeof runtime === "function"
			? runtime()
			: runtime)) as NodeRuntimeAdapter;
		const host = await createLucidHost({
			...build.host,
			definition: { ...build.host.definition, runtime: adapter },
			runtimeContext: getRuntimeContext({
				compiled: true,
				pluginData: build.pluginData,
				pluginModules: build.pluginModules,
			}),
			databaseScope: "runtime",
		});
		const env = host.env;
		let jobScheduler: ReturnType<typeof createNodeJobScheduler> | undefined;
		let destroyPromise: Promise<void> | undefined;
		destroyRuntime = () => {
			destroyPromise ??= (async () => {
				await jobScheduler?.destroy();
				await host.destroy();
			})();
			return destroyPromise;
		};

		const options = adapter.getOptions();
		const port =
			options?.server?.port ?? Number.parseInt(process.env.PORT || "6543", 10);
		const hostname =
			options?.server?.hostname ?? process.env.HOST ?? process.env.HOSTNAME;

		const server = serve({
			fetch: async (request, requestBindings) => {
				const invocation = host.createInvocation({ env });
				try {
					const response = await invocation.handle({
						request,
						requestBindings,
					});
					return withResponseCleanup(response, () => invocation.destroy());
				} catch (error) {
					await invocation.destroy();
					throw error;
				}
			},
			port,
			hostname,
		});
		jobScheduler = createNodeJobScheduler({
			createInvocation: () => host.createInvocation({ env }),
			request: {
				url: host.config.urls.cms ?? `http://localhost:${port}`,
			},
		});
		jobScheduler.start();

		server.on("listening", () => {
			const address = server.address();
			if (!address || typeof address === "string") {
				console.log(address);
				return;
			}
			console.log(
				address.address === "::"
					? `http://localhost:${address.port}`
					: `http://${address.address}:${address.port}`,
			);
		});
		server.on("close", () => {
			void destroyRuntime();
		});

		let shutdownPromise: Promise<void> | undefined;
		const shutdown = () => {
			shutdownPromise ??= (async () => {
				let exitCode = 0;
				if (server.listening) {
					await new Promise<void>((resolve) => {
						server.close((error) => {
							if (error) {
								console.error(error);
								exitCode = 1;
							}
							resolve();
						});
					});
				}
				await destroyRuntime();
				process.exit(exitCode);
			})();
			return shutdownPromise;
		};

		process.on("SIGINT", shutdown);
		process.on("SIGTERM", shutdown);
	} catch (error) {
		logger.error({
			error,
			event: "runtime-node.startup.failed",
			message: "Failed to start the Node runtime",
			scope: "runtime-node",
		});
		await logger.flush();
		await destroyRuntime();
		process.exit(1);
	}
};
