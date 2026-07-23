import { serve } from "@hono/node-server";
import { createApp } from "@lucidcms/core/runtime";
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

		const {
			app,
			destroy: destroyApp,
			issues,
		} = await createApp({
			config,
			translationStore,
			runtimeContext: runtimeContext,
			env: process.env,
		});

		for (const issue of issues) {
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

		const server = serve({
			fetch: app.fetch,
			port: options?.server?.port ?? 6543,
			hostname: options?.server?.hostname,
		});

		server.on("listening", () => {
			const address = server.address();
			onListening({
				address: address,
			});
		});

		let destroyPromise: Promise<void> | undefined;

		server.on("close", () => {
			logger.instance.info("Shutting down Node Adapter development server...", {
				silent: logger.silent,
				spaceBefore: true,
			});
			destroyPromise ??= destroyApp();
			void destroyPromise;
		});

		return {
			destroy: async () => {
				try {
					await new Promise<void>((resolve, reject) => {
						server.close((error) => {
							if (error) reject(error);
							else resolve();
						});
					});
				} finally {
					destroyPromise ??= destroyApp();
					await destroyPromise;
				}
			},
			runtimeContext: runtimeContext,
		};
	};

export default serveCommand;
