import { existsSync } from "node:fs";
import path from "node:path";
import type { LucidAstroIntegrationBridge } from "@lucidcms/astro/types";
import { LucidError } from "@lucidcms/core/runtime";
import type { Plugin } from "vite";
import constants, { AGENT_RUNS_EXPORT } from "./constants.js";
import assetHeadersPlugin from "./services/asset-headers-plugin.js";
import inspectorPortLogsPlugin from "./services/inspector-port-logs-plugin.js";
import listOptimizeEntries from "./services/list-optimize-entries.js";
import renderWorkerHandlers from "./services/render-worker-handlers.js";

const resolvedWorkerEntry = `\0${constants.ASTRO_WORKER_ENTRY}`;

/** Build-time Astro bridge for the Cloudflare runtime. */
const cloudflareAstroIntegration = {
	validateAdapter(adapter) {
		if (!adapter?.name.toLowerCase().includes("cloudflare")) {
			throw new LucidError({
				message:
					"The Lucid Cloudflare runtime requires @astrojs/cloudflare in astro.config.*.",
			});
		}
	},
	/** Supplies Astro Vite settings that serve `withLucid`'s Worker entry from `cloudflare.config.ts` for Astro's Cloudflare adapter, adding Lucid's scheduler, plugin handlers, agent run Durable Object and asset caching through `_headers`. */
	vite(props) {
		if (
			!existsSync(path.join(props.project.projectRoot, constants.CONFIG_FILE))
		) {
			throw new LucidError({
				message:
					"Astro's Cloudflare adapter reads the Worker from `cloudflare.config.ts`. Add one that wraps its Worker in `withLucid` from @lucidcms/runtime-cloudflare/config.",
			});
		}

		const handlers = renderWorkerHandlers(props.project.artifacts.build);
		const workerEntry: Plugin = {
			name: "lucid:astro-cloudflare-worker",
			resolveId: {
				filter: { id: /^virtual:lucid\/astro-worker$/ },
				handler: () => resolvedWorkerEntry,
			},
			load: {
				filter: { id: /^\0virtual:lucid\/astro-worker$/ },
				handler: () => `import { handle } from "@astrojs/cloudflare/handler";
import { createAstroWorker } from "@lucidcms/runtime-cloudflare/astro";
import { createAstroAgentRuns } from "@lucidcms/runtime-cloudflare/entry";
import { createLucidInvocation } from ${JSON.stringify(props.runtimeModuleId)};
${handlers.imports}

export default createAstroWorker({ fetch: handle, createLucidInvocation }, ${handlers.handlers});
export const ${AGENT_RUNS_EXPORT} = createAstroAgentRuns({ createLucidInvocation });
`,
			},
		};

		return {
			plugins: [workerEntry, assetHeadersPlugin(), inspectorPortLogsPlugin()],
			aliases: {
				"cross-fetch": "cross-fetch/dist/browser-ponyfill.js",
			},
			ssrEnvironment: {
				optimizeDeps: {
					entries: listOptimizeEntries(props.project, [
						"@astrojs/cloudflare/handler",
						"@lucidcms/runtime-cloudflare/astro",
						"@lucidcms/runtime-cloudflare/entry",
						...handlers.modules,
					]),
					// Late optimization restarts the Worker while its initial modules are loading.
					include: ["kysely/migration"],
				},
				build: {
					rolldownOptions: {
						output: {
							codeSplitting: {
								// Zod's cyclic modules must initialize together in the Worker.
								groups: [
									{ name: "zod", test: /[/\\]node_modules[/\\]zod[/\\]/ },
								],
							},
						},
					},
				},
			},
		};
	},
} satisfies LucidAstroIntegrationBridge;

export default cloudflareAstroIntegration;
