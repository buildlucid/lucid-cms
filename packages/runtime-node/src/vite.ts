import { rm } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { getRequestListener } from "@hono/node-server";
import { buildModuleId, hostedModuleId } from "@lucidcms/core/build";
import { LucidError } from "@lucidcms/core/runtime";
import type { LucidBuild } from "@lucidcms/core/types";
import type { RuntimeViteIntegration } from "@lucidcms/core/vite";
import { type Connect, isRunnableDevEnvironment } from "vite";
import constants from "./constants.js";
import { createRequestHandler, type NodeRequestHandler } from "./handler.js";
import type { NodeRuntimeAdapter } from "./types.js";

const serverEntryId = "virtual:lucid/node-server";
const devEntryId = "virtual:lucid/node-dev";
const hostedServerId = "virtual:lucid/node-hosted-server";

const entrySources: Record<string, string> = {
	[serverEntryId]: `import build from "${buildModuleId}";
import { startServer } from "@lucidcms/runtime-node/entry";

startServer(build);
`,
	// Vite re-imports this after a project change, so the previous handler's host is destroyed first.
	[devEntryId]: `import build from "${buildModuleId}";
import { createRequestHandler } from "@lucidcms/runtime-node/handler";

const handler = createRequestHandler(build, { compiled: false });
if (import.meta.hot) import.meta.hot.dispose(() => handler.destroy());

export default handler;
`,
};

/** Adapts a request handler to Connect middleware, for Vite's dev and preview servers. */
const createMiddleware = (
	getHandler: () => Promise<NodeRequestHandler>,
): Connect.NextHandleFunction => {
	const listener = getRequestListener(async (request, requestBindings) => {
		const response = await (await getHandler()).handle(
			request,
			requestBindings,
		);
		// Vite's preview compression holds `writeHead` back, so Hono flushing a streamed body's headers would send 200.
		requestBindings.outgoing.statusCode = response.status;
		return response;
	});
	return (request, response, next) => {
		listener(request, response).catch(next);
	};
};

/** Runs development and preview Lucid servers in Vite's process, building a Node server beside client output with project code bundled and packages loaded from `node_modules`. */
const nodeVite: RuntimeViteIntegration<NodeRuntimeAdapter> = {
	listen: (adapter) => adapter.getOptions()?.server,
	plugins: (project) => {
		let devHandler: NodeRequestHandler | undefined;
		let previewHandler: Promise<NodeRequestHandler> | undefined;

		return [
			{
				name: "lucid:runtime-node",
				config: () => ({
					environments: {
						ssr: {
							build: {
								outDir: path.resolve(project.config.build.outDir),
								// The client builds first, into a folder inside this one, so `buildApp` empties the output instead.
								emptyOutDir: false,
								rolldownOptions: {
									input: {
										[constants.ENTRY]: serverEntryId,
										[constants.BUILD_MODULE]: buildModuleId,
									},
									output: { chunkFileNames: "lucid/chunks/[name]-[hash].js" },
								},
							},
						},
					},
				}),
				// Packages load from `node_modules`, so Lucid's core is shared with the handler that serves the build. It's set
				// here, after Vite merges plugins' `ssr.external` lists into the environment, as a list would replace `true`.
				configEnvironment(name, config) {
					if (name !== "ssr") return;

					config.resolve ??= {};
					config.resolve.external = true;
				},
				buildApp: {
					order: "pre",
					handler: () =>
						rm(path.resolve(project.config.build.outDir), {
							recursive: true,
							force: true,
						}),
				},
				applyToEnvironment: (environment) => environment.name === "ssr",
				resolveId: {
					filter: { id: /^virtual:lucid\/node-/ },
					handler: (source) => `\0${source}`,
				},
				load: {
					filter: { id: /^\0virtual:lucid\/node-/ },
					handler: (id) => entrySources[id.slice(1)],
				},
				configureServer(server) {
					const environment = server.environments.ssr;
					const middleware = createMiddleware(async () => {
						if (!environment || !isRunnableDevEnvironment(environment)) {
							throw new Error(
								"The Node runtime needs a runnable server environment.",
							);
						}

						const imported = await environment.runner.import<{
							default: NodeRequestHandler;
						}>(devEntryId);
						devHandler = imported.default;
						return devHandler;
					});

					// Runs after Vite's own middleware, so client modules and assets are served first.
					return () => {
						server.middlewares.use(middleware);
					};
				},
				// The host releases its connections when the dev server closes or restarts.
				async closeServer() {
					await devHandler?.destroy();
					devHandler = undefined;
				},
				configurePreviewServer(server) {
					const getHandler = () => {
						previewHandler ??= (async () => {
							const imported: { default: LucidBuild } = await import(
								pathToFileURL(
									path.resolve(
										project.config.build.outDir,
										`${constants.BUILD_MODULE}.js`,
									),
								).href
							);

							return createRequestHandler(imported.default, {
								compiled: true,
							});
						})();

						return previewHandler;
					};

					// Runs after Vite serves the client output, so only other requests reach Lucid.
					return () => {
						server.middlewares.use(createMiddleware(getHandler));
					};
				},
				// Closing waits for the host's cleanup, such as its queue, so commands can exit once it resolves.
				async closePreviewServer() {
					const current = await previewHandler?.catch(() => undefined);
					previewHandler = undefined;
					await current?.destroy();
				},
			},
		];
	},
	hosted: {
		module: "@lucidcms/runtime-node/hosted",
		/** Wraps the host's server build input so Lucid's job scheduler starts beside it, as the host owns the process. */
		plugins: (_project, { serverEntry }) => {
			if (!serverEntry) {
				throw new LucidError({
					message:
						"The Node runtime starts Lucid's job scheduler beside the host's server build, which the host doesn't name.",
				});
			}

			return [
				{
					name: "lucid:runtime-node-hosted",
					apply: "build",
					// Runs after the host's config sets its server input.
					configEnvironment: {
						order: "post",
						handler(name, config) {
							if (name !== serverEntry.environment) return;

							const input = config.build?.rolldownOptions?.input;
							const entry =
								typeof input === "object" && !Array.isArray(input)
									? input[serverEntry.input]
									: undefined;
							if (
								typeof input !== "object" ||
								Array.isArray(input) ||
								entry === undefined
							) {
								throw new LucidError({
									message: `The Node runtime couldn't find the host's server build input "${serverEntry.input}". Check its adapter builds a server.`,
								});
							}

							input[serverEntry.input] =
								`${hostedServerId}?${new URLSearchParams({ entry })}`;
						},
					},
					resolveId: {
						filter: { id: new RegExp(`^${RegExp.escape(hostedServerId)}\\?`) },
						handler: (source) => `\0${source}`,
					},
					load: {
						filter: {
							id: new RegExp(`^\\0${RegExp.escape(hostedServerId)}\\?`),
						},
						handler: (id) => {
							const entry = new URLSearchParams(id.split("?")[1]).get("entry");
							if (!entry) return;

							// Node servers start from their named exports, such as `startServer`, which the wrapper keeps.
							return `import lucid from "${hostedModuleId}";
import { createNodeJobScheduler } from "@lucidcms/runtime-node";

export * from ${JSON.stringify(entry)};

createNodeJobScheduler({ createInvocation: () => lucid.createInvocation() }).start();
`;
						},
					},
				},
			];
		},
	},
};

export default nodeVite;
