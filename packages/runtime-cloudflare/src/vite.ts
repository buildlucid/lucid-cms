import { existsSync } from "node:fs";
import path from "node:path";
import { cloudflare } from "@cloudflare/vite-plugin";
import { buildModuleId } from "@lucidcms/core/build";
import type { RuntimeViteIntegration } from "@lucidcms/core/vite";
import constants, { DEFAULT_COMPATIBILITY_DATE } from "./constants.js";
import assetHeadersPlugin from "./services/asset-headers-plugin.js";
import createWorkerConfig from "./services/create-worker-config.js";
import getWorkerSecrets from "./services/get-worker-secrets.js";
import inspectorPortLogsPlugin from "./services/inspector-port-logs-plugin.js";
import listOptimizeEntries from "./services/list-optimize-entries.js";
import loadDevEnv from "./services/load-dev-env.js";
import renderWorkerHandlers from "./services/render-worker-handlers.js";
import type { CloudflareRuntimeAdapter } from "./types.js";

const workerEntryId = "virtual:lucid/cloudflare-worker";

/** Runs Lucid's Worker with local bindings in Vite's workerd server environment and builds for `cf deploy`, supplying Worker settings so `cloudflare.config.ts` is needed only for unmanaged options. */
const cloudflareVite: RuntimeViteIntegration<CloudflareRuntimeAdapter> = {
	loadEnv: ({ projectRoot, mode }) => loadDevEnv(projectRoot, mode),
	startMessage: "Starting the Worker",
	listen: (adapter) => adapter.getOptions()?.dev,
	plugins: (project, { remote, preview }) => {
		const options = project.adapter.getOptions();
		// A project's own `cloudflare.config.ts` names its Worker and sets the compatibility date.
		const ownsWorker = existsSync(
			path.join(project.projectRoot, constants.CONFIG_FILE),
		);
		const handlers = renderWorkerHandlers(project.artifacts.build);
		// Set by this plugin's `config` hook, which runs before the Cloudflare plugin asks for the Worker's settings. Builds
		// for `lucidcms serve` are only previewed locally.
		let deploy = false;
		const entrySource = `import build from "${buildModuleId}";
import { createWorker } from "@lucidcms/runtime-cloudflare/entry";
${handlers.imports}

export default createWorker(build, ${handlers.handlers});
`;

		return [
			{
				name: "lucid:runtime-cloudflare",
				config: (_, env) => {
					deploy = env.command === "build" && !preview;
					return {
						environments: {
							ssr: {
								build: {
									// Vite leaves server builds unminified, but the Worker's size counts towards Cloudflare's upload limit.
									minify: true,
									// One module keeps cyclic dependencies, such as Zod's, initializing in order in the Worker.
									rolldownOptions: { output: { codeSplitting: false } },
								},
								optimizeDeps: {
									entries: listOptimizeEntries(project, [
										"@lucidcms/runtime-cloudflare/entry",
										...handlers.modules,
									]),
								},
							},
						},
					};
				},
				applyToEnvironment: (environment) => environment.name === "ssr",
				resolveId: {
					filter: { id: /^virtual:lucid\/cloudflare-worker$/ },
					handler: (source) => `\0${source}`,
				},
				load: {
					filter: { id: /^\0virtual:lucid\/cloudflare-worker$/ },
					handler: () => entrySource,
				},
			},
			assetHeadersPlugin(),
			inspectorPortLogsPlugin(),
			cloudflare({
				viteEnvironment: { name: "ssr" },
				// Receives `cloudflare.config.ts`, or the plugin's defaults, and returns Lucid's additions, which the plugin
				// merges over it.
				config: (base) =>
					createWorkerConfig({
						// Without its own config, the plugin names the Worker from the package or folder, or the name Workers
						// Builds sets.
						name: ownsWorker ? base.name : (options?.worker?.name ?? base.name),
						compatibilityDate: ownsWorker
							? base.compatibilityDate
							: (options?.worker?.compatibilityDate ??
								DEFAULT_COMPATIBILITY_DATE),
						entrypoint: workerEntryId,
						options,
						artifacts: project.artifacts.prepare,
						secrets: getWorkerSecrets(project, { deploy }),
						worker: base,
						remote,
					}),
			}),
		];
	},
};

export default cloudflareVite;
