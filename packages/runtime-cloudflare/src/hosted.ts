import { AsyncLocalStorage } from "node:async_hooks";
import {
	createAdminDocumentExtension,
	handleDevTask,
	handleHostRequest,
} from "@lucidcms/core/runtime";
import type { LucidBuild } from "@lucidcms/core/types";
import { env as workerEnv } from "cloudflare:workers";
import adminShellExtension from "./services/admin-shell-extension.js";
import createHostCache, {
	runtimeHostKeys,
} from "./services/create-host-cache.js";
import createHostGetter from "./services/create-host-getter.js";
import platformContextExtension from "./services/platform-context-extension.js";
import type { CloudflareHostedLucid, CloudflarePlatform } from "./types.js";

/** Runs Lucid inside a host's Worker, which `lucid:hosted` creates from the project's build, with one host for the host's requests and the Worker's events. */
export const createHostedLucid = (build: LucidBuild): CloudflareHostedLucid => {
	const hosts = createHostCache();
	const getHost = createHostGetter(build, hosts);
	const platforms = new AsyncLocalStorage<CloudflarePlatform>();
	const extensions = [
		platformContextExtension,
		build.admin
			? createAdminDocumentExtension(build.admin.html)
			: adminShellExtension,
	];

	/** The current Worker event, or the Worker's bindings alone, such as while the host prerenders pages. */
	const resolvePlatform = (platform?: CloudflarePlatform) =>
		platform ?? platforms.getStore() ?? { env: workerEnv };

	return {
		handle: async (request) => {
			const { env, ctx } = resolvePlatform();
			const host = await getHost(runtimeHostKeys.http, env, ctx, extensions);

			if (build.dev) {
				const task = await handleDevTask({
					request,
					host,
					dev: build.dev,
					env,
				});
				if (task) return task;
			}

			return handleHostRequest(host, { request, executionContext: ctx, env });
		},
		createInvocation: async (platform) => {
			const { env, ctx } = resolvePlatform(platform);
			const host = await getHost(runtimeHostKeys.http, env, ctx, extensions);
			return host.createInvocation({ env });
		},
		withPlatform: (platform, run) => platforms.run(platform, run),
		destroy: () => hosts.destroy(),
	};
};
