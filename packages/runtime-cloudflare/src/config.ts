import type { WorkerConfig } from "@cloudflare/config";

/**
 * Wraps the host's Worker, or a custom `entrypoint`, with Lucid's scheduler, plugin handlers and agent run Durable Object, adding cron and queue triggers, bindings and secrets while preserving existing `cloudflare.config.ts` settings and bindings.
 *
 * @example
 * ```ts
 * // cloudflare.config.ts
 * import { bindings, defineConfig } from "cf/config";
 * import { withLucid } from "@lucidcms/runtime-cloudflare/config";
 *
 * export default defineConfig({
 *   worker: withLucid({
 *     name: "my-site",
 *     compatibilityDate: "2026-06-30",
 *     env: {
 *       LUCID_DB: bindings.hyperdrive({ id: "HYPERDRIVE_ID" }),
 *     },
 *   }),
 * });
 * ```
 */
export const withLucid =
	(worker: WorkerConfig, options?: { configPath?: string }) =>
	async (): Promise<WorkerConfig> => {
		// Cloudflare's config loader denies Vite access to the files this module imports as it loads, which would include
		// Lucid modules the Worker shares, so they load when the Worker's config resolves instead.
		const { default: resolveLucidWorker } =
			await import("./services/resolve-lucid-worker.js");
		return resolveLucidWorker(worker, options);
	};
