import type { WorkerConfig } from "@cloudflare/config";

/**
 * Adds Lucid's entry, scheduler, plugin handlers, agent run Durable Object, cron and queue triggers, bindings and secrets to the Worker read exclusively from `cloudflare.config.ts` by Astro's Cloudflare adapter, preserving existing settings and bindings.
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
		const { default: resolveLucidWorker } = await import(
			"./services/resolve-lucid-worker.js"
		);
		return resolveLucidWorker(worker, options);
	};
