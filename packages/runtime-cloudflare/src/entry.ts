import {
	createAdminDocumentExtension,
	handleDevTask,
	handleHostRequest,
} from "@lucidcms/core/runtime";
import type { EnvironmentVariables, LucidBuild } from "@lucidcms/core/types";
import adminShellExtension from "./services/admin-shell-extension.js";
import createAgentRunObject from "./services/create-agent-run-object.js";
import createHostCache, {
	runtimeHostKeys,
} from "./services/create-host-cache.js";
import createHostGetter from "./services/create-host-getter.js";
import createScheduledHandler from "./services/create-scheduled-handler.js";
import platformContextExtension from "./services/platform-context-extension.js";
import wrapWorkerHandlers from "./services/wrap-worker-handlers.js";
import type {
	CloudflareExecutionContext,
	CloudflareHostedLucid,
	CloudflareWorkerHandler,
} from "./types.js";

/** The generated Worker's hosts, which its handlers and Durable Objects share for the isolate's lifetime. */
const workerHosts = createHostCache();

/** A Worker's `fetch`, such as the one a host's Worker module exports. */
type WorkerFetch = (
	request: Request,
	env: EnvironmentVariables,
	ctx: CloudflareExecutionContext,
) => Response | Promise<Response>;

/** Creates the generated project Worker's Lucid `fetch`, `scheduled` and plugin handlers, using build-carried admin documents and Vite tasks during development and static admin assets in builds. */
export const createWorker = (
	build: LucidBuild,
	handlers: Record<string, CloudflareWorkerHandler> = {},
) => {
	const getHost = createHostGetter(build, workerHosts);

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
	const getHost = createHostGetter(build, workerHosts);

	return createAgentRunObject(async (env, ctx) => {
		const host = await getHost(runtimeHostKeys.background, env, ctx);
		return host.createInvocation({ env });
	});
};

/** Wraps a host's Worker with Lucid's `scheduled` and plugin handlers, keeping its other events and running its `fetch` with the Worker event Lucid reads for the requests the host passes on. */
export const createHostedWorker = (
	lucid: CloudflareHostedLucid,
	hostWorker: { fetch: WorkerFetch },
	handlers: Record<string, CloudflareWorkerHandler> = {},
) => {
	const createInvocation = (
		env: EnvironmentVariables,
		ctx: CloudflareExecutionContext,
	) => lucid.createInvocation({ env, ctx });

	return {
		...hostWorker,
		...wrapWorkerHandlers(handlers, createInvocation),
		fetch: (
			request: Request,
			env: EnvironmentVariables,
			ctx: CloudflareExecutionContext,
		) =>
			lucid.withPlatform({ env, ctx }, () =>
				hostWorker.fetch(request, env, ctx),
			),
		scheduled: createScheduledHandler(createInvocation),
	};
};

/** Creates the agent run Durable Object class for a host's Worker, which shares Lucid's hosted instance. */
export const createHostedAgentRuns = (lucid: CloudflareHostedLucid) =>
	createAgentRunObject((env, ctx) => lucid.createInvocation({ env, ctx }));
