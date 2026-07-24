import { serve } from "@hono/node-server";
import { createLucidHost, withResponseCleanup } from "@lucidcms/core/runtime";
import type { ServeHandler } from "@lucidcms/core/types";
import getRuntimeContext from "../services/runtime-context.js";
import type { NodeAdapterOptions } from "../types.js";

const serveCommand =
	(options: NodeAdapterOptions | undefined): ServeHandler =>
	async ({ config, translationStore, logger, onListening }) => {
		logger.instance.info(
			"Using:",
			logger.instance.color.blue("Node Runtime Adapter"),
			{
				silent: logger.silent,
			},
		);
		logger.instance.info("Starting development server...", {
			silent: logger.silent,
		});

		const runtimeContext = getRuntimeContext({
			compiled: false,
		});

		const host = await createLucidHost({
			config,
			translationStore,
			runtimeContext: runtimeContext,
			env: process.env,
			databaseScope: "runtime",
		});

		for (const issue of host.issues) {
			if (issue.level === "unsupported") {
				logger.instance.error(
					issue.type,
					issue.key,
					"-",
					issue.message ||
						"This is unsupported in your current runtime environment.",
					{
						silent: logger.silent,
					},
				);
			}
			if (issue.level === "notice" && issue.message) {
				logger.instance.warn(issue.type, issue.key, "-", issue.message, {
					silent: logger.silent,
				});
			}
		}

		let server: ReturnType<typeof serve>;
		try {
			server = serve({
				fetch: async (request, requestBindings) => {
					const invocation = host.createInvocation({ env: process.env });
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
				port: options?.server?.port ?? 6543,
				hostname: options?.server?.hostname,
			});
		} catch (error) {
			await host.destroy();
			throw error;
		}

		server.on("listening", () => {
			const address = server.address();
			onListening({
				address: address,
			});
		});

		server.on("close", () => {
			logger.instance.info("Shutting down Node Adapter development server...", {
				silent: logger.silent,
				spaceBefore: true,
			});
			void host.destroy();
		});

		let destroyPromise: Promise<void> | undefined;
		return {
			destroy: () => {
				destroyPromise ??= (async () => {
					try {
						if (server.listening) {
							await new Promise<void>((resolve, reject) => {
								server.close((error) => {
									if (error) reject(error);
									else resolve();
								});
							});
						}
					} finally {
						await host.destroy();
					}
				})();
				return destroyPromise;
			},
			runtimeContext: runtimeContext,
		};
	};

export default serveCommand;
