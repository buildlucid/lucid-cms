import {
	createAdminDocumentExtension,
	handleDevTask,
	handleHostRequest,
	shouldServeAdminShell,
} from "@lucidcms/core/runtime";
import type {
	EnvironmentVariables,
	HttpExtension,
	LucidBuild,
} from "@lucidcms/core/types";
import type { createAstroWorker } from "./astro.js";
import constants from "./constants.js";
import createAgentRunObject from "./services/create-agent-run-object.js";
import createHostGetter from "./services/create-host-getter.js";
import createScheduledHandler from "./services/create-scheduled-handler.js";
import platformContextExtension from "./services/platform-context-extension.js";
import { runtimeHostKeys } from "./services/runtime-host.js";
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
	const getHost = createHostGetter(build);

	const httpExtensions = [
		platformContextExtension,
		build.admin
			? createAdminDocumentExtension(build.admin.html)
			: adminShellExtension,
	];

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

/** Creates the generated project Worker's agent run Durable Object class, which shares the Worker's Lucid host. */
export const createAgentRuns = (build: LucidBuild) => {
	const getHost = createHostGetter(build);

	return createAgentRunObject(async (env, ctx) => {
		const host = await getHost(runtimeHostKeys.background, env, ctx);
		return host.createInvocation({ env });
	});
};

/** Creates the agent run Durable Object class for Lucid's Astro Worker entry, which shares Lucid's Astro host. */
export const createAstroAgentRuns = (options: {
	createLucidInvocation: Parameters<
		typeof createAstroWorker
	>[0]["createLucidInvocation"];
}) =>
	createAgentRunObject(async (env, ctx) => {
		const { invocation } = await options.createLucidInvocation({
			runtime: { env, ctx },
		});
		return invocation;
	});
