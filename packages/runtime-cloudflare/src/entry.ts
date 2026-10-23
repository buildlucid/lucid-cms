import {
	createAdminDocumentExtension,
	createLucidHost,
	handleDevTask,
	handleHostRequest,
	shouldServeAdminShell,
} from "@lucidcms/core/runtime";
import type {
	EnvironmentVariables,
	HttpExtension,
	LucidBuild,
} from "@lucidcms/core/types";
import constants from "./constants.js";
import createScheduledHandler from "./services/create-scheduled-handler.js";
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

/** Creates the generated project Worker's Lucid `fetch`, `scheduled` and plugin handlers, using build-carried admin documents and Vite tasks during development and static admin assets in builds. */
export const createWorker = (
	build: LucidBuild,
	handlers: Record<string, CloudflareWorkerHandler> = {},
) => {
	const runtimeContext = getRuntimeContext({
		compiled: build.dev === undefined,
		pluginModules: build.pluginModules,
	});

	const httpExtensions = [
		platformContextExtension,
		build.admin
			? createAdminDocumentExtension(build.admin.html)
			: adminShellExtension,
	];

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

	const createBackgroundInvocation = async (
		env: EnvironmentVariables,
		ctx: CloudflareExecutionContext,
	) => {
		const host = await getHost(runtimeHostKeys.background, env, ctx);
		return host.createInvocation({ env });
	};

	return {
		...wrapWorkerHandlers(handlers, createBackgroundInvocation),
		fetch: async (
			request: Request,
			env: EnvironmentVariables,
			ctx: CloudflareExecutionContext,
		) => {
			const host = await getHost(
				runtimeHostKeys.http,
				env,
				ctx,
				httpExtensions,
			);

			if (build.dev) {
				const task = await handleDevTask({
					request,
					host,
					dev: build.dev,
					env,
				});
				if (task) return task;
			}

			return handleHostRequest(host, {
				request,
				executionContext: ctx,
				env,
			});
		},
		scheduled: createScheduledHandler(createBackgroundInvocation),
	};
};
