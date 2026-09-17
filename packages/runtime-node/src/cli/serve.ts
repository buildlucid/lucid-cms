import { createServer } from "node:http";
import { getRequestListener } from "@hono/node-server";
import { createCliAdmin } from "@lucidcms/core/build";
import { createLucidHost, withResponseCleanup } from "@lucidcms/core/runtime";
import type { ServeHandler } from "@lucidcms/core/types";
import getRuntimeContext from "../services/runtime-context.js";
import type { NodeAdapterOptions } from "../types.js";

const serveCommand =
	(options: NodeAdapterOptions | undefined): ServeHandler =>
	async ({
		config,
		env,
		translationStore,
		logger,
		onListening,
		mode,
		projectRoot,
		configPath,
	}) => {
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
			env,
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

		const server = createServer();

		let admin: Awaited<ReturnType<typeof createCliAdmin>> | undefined;
		let destroyPromise: Promise<void> | undefined;

		const destroy = () => {
			destroyPromise ??= (async () => {
				try {
					await admin?.close();
				} finally {
					try {
						if (server.listening) await server[Symbol.asyncDispose]();
					} finally {
						await host.destroy();
					}
				}
			})();
			return destroyPromise;
		};

		try {
			if (mode === "development") {
				admin = await createCliAdmin({
					server,
					projectRoot,
					configPath,
					admin: config.admin,
				});
			}

			const listener = getRequestListener(async (request, requestBindings) => {
				const invocation = host.createInvocation();
				try {
					const response = await invocation.handle({
						request,
						requestBindings,
					});

					const result = await withResponseCleanup(response, () =>
						invocation.destroy(),
					);

					return admin ? await admin.handleResponse(request, result) : result;
				} catch (error) {
					await invocation.destroy();
					throw error;
				}
			});

			server.on("request", (request, response) => {
				if (!admin) return void listener(request, response);
				admin.middleware(request, response, () => {
					void listener(request, response);
				});
			});

			await new Promise<void>((resolve, reject) => {
				server.once("error", reject);
				server.listen(
					options?.server?.port ?? 6543,
					options?.server?.hostname,
					() => {
						server.off("error", reject);
						resolve();
					},
				);
			});

			await onListening({
				address: server.address(),
				adapterKeys: host.adapterKeys,
			});
		} catch (error) {
			await destroy();
			throw error;
		}

		return {
			destroy,
			runtimeContext: runtimeContext,
			adapterKeys: host.adapterKeys,
		};
	};

export default serveCommand;
