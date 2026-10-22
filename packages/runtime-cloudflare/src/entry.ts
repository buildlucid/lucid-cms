import {
	createLucidHost,
	setupJobScheduler,
	shouldServeAdminShell,
	withResponseCleanup,
} from "@lucidcms/core/runtime";
import type {
	EnvironmentVariables,
	HttpExtension,
	LucidBuild,
} from "@lucidcms/core/types";
import constants from "./constants.js";
import getRuntimeContext from "./services/get-runtime-context.js";
import platformContextExtension from "./services/platform-context-extension.js";
import getOrCreateRuntimeHost, {
	runtimeHostKeys,
} from "./services/runtime-host.js";
import wrapWorkerHandlers from "./services/wrap-worker-handlers.js";
import type {
	CloudflareExecutionContext,
	CloudflareWorkerHandler,
} from "./types.js";

/** The Worker bindings Lucid's own handlers read, alongside the project's. */
type WorkerEnv = EnvironmentVariables & {
	[constants.ASSETS_BINDING]: {
		fetch(request: Request): Promise<Response>;
	};
};

/** Serves the admin's index page from Workers static assets for client-side routes. */
const adminShellExtension: HttpExtension = {
	name: "runtime-cloudflare:spa-shell",
	phase: "afterSetup",
	register: (app) => {
		app.get("/admin/*", async (c, next) => {
			if (!shouldServeAdminShell(c.req.path, c.req.method)) return next();
			const url = new URL(c.req.url);
			const assets = (c.env as WorkerEnv)[constants.ASSETS_BINDING];
			const indexAsset = await assets.fetch(
				new Request(`${url.origin}/admin/index.html`),
			);
			return new Response(indexAsset.body, {
				status: indexAsset.status,
				headers: indexAsset.headers,
			});
		});
	},
};

/** Creates the Worker exported by generated project entries, combining Lucid's `fetch` and `scheduled` with plugin handlers. */
export const createWorker = (
	build: LucidBuild,
	handlers: Record<string, CloudflareWorkerHandler> = {},
) => {
	const runtimeContext = getRuntimeContext({
		server: "cloudflare",
		compiled: true,
		pluginData: build.pluginData,
		pluginModules: build.pluginModules,
	});
	const getHost = (
		key: string,
		env: EnvironmentVariables,
		ctx: CloudflareExecutionContext,
		extensions?: HttpExtension[],
	) =>
		getOrCreateRuntimeHost(
			key,
			() =>
				createLucidHost({
					...build.host,
					env,
					runtimeContext,
					databaseScope: "invocation",
					http: extensions ? { extensions } : undefined,
				}),
			(promise) => ctx.waitUntil(promise),
		);

	return {
		...wrapWorkerHandlers(handlers, async (env, ctx) => {
			const host = await getHost(runtimeHostKeys.background, env, ctx);
			return host.createInvocation({ env });
		}),
		fetch: async (
			request: Request,
			env: EnvironmentVariables,
			ctx: CloudflareExecutionContext,
		) => {
			const host = await getHost(runtimeHostKeys.http, env, ctx, [
				platformContextExtension,
				adminShellExtension,
			]);
			const invocation = host.createInvocation({ env });
			try {
				const response = await invocation.handle({
					request,
					executionContext: ctx,
				});
				return withResponseCleanup(response, () => invocation.destroy());
			} catch (error) {
				await invocation.destroy();
				throw error;
			}
		},
		scheduled: async (
			controller: { scheduledTime: number },
			env: EnvironmentVariables,
			ctx: CloudflareExecutionContext,
		) => {
			const runJobScheduler = async () => {
				const host = await getHost(runtimeHostKeys.background, env, ctx);
				const invocation = host.createInvocation({ env });
				try {
					await setupJobScheduler().run(await invocation.getServiceContext(), {
						scheduledAt: new Date(controller.scheduledTime),
					});
				} finally {
					await invocation.destroy();
				}
			};

			ctx.waitUntil(runJobScheduler());
		},
	};
};
