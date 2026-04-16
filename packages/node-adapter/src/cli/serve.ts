import { serve } from "@hono/node-server";
import lucid from "@lucidcms/core/runtime";
import type { ServeHandler } from "@lucidcms/core/types";
import getRuntimeContext from "../services/runtime-context.js";
import type { NodeAdapterOptions } from "../types.js";

const serveCommand =
	(options: NodeAdapterOptions | undefined): ServeHandler =>
	async ({ config, logger, onListening }) => {
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

		const { app, destroy, issues } = await lucid.createApp({
			config,
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

		server.on("close", async () => {
			logger.instance.info("Shutting down Node Adapter development server...", {
				silent: logger.silent,
				spaceBefore: true,
			});
			await destroy?.();
		});

		return {
			destroy: async () => {
				return new Promise<void>((resolve, reject) => {
					server.close((error) => {
						if (error) {
							reject(error);
						} else {
							resolve();
						}
					});
				});
			},
			runtimeContext: runtimeContext,
		};
	};

export default serveCommand;
