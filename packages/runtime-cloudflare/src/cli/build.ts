import { buildModuleId } from "@lucidcms/core/build";
import type {
	BuildHandler,
	BundlerPlugin,
	RuntimePrepareArtifacts,
} from "@lucidcms/core/types";
import constants from "../constants.js";
import getRuntimeContext from "../services/get-runtime-context.js";
import renderWorkerHandlers from "../services/render-worker-handlers.js";
import writeWranglerConfig from "../services/write-wrangler-config.js";
import type { AdapterOptions } from "../types.js";
import toDisplayPath from "../utils/path-to-display.js";
import replaceImportMetaUrl from "../utils/replace-import-meta-url.js";

/** Workers lack `import.meta.url`, so replace expressions introduced by the bundler while preserving string literals. */
const importMetaUrlPolyfill: BundlerPlugin = {
	name: "runtime-cloudflare:import-meta-url",
	renderChunk(code) {
		if (!code.includes("import.meta.url")) return null;
		return replaceImportMetaUrl(
			code,
			this.parse(code),
			`"file:///${constants.ENTRY}.js"`,
		);
	},
};

/** Writes the build's Wrangler config and describes the Worker for Lucid to bundle into a single module. */
const buildCommand =
	(
		options: AdapterOptions | undefined,
		prepareArtifacts?: RuntimePrepareArtifacts,
	): BuildHandler =>
	async ({ configPath, outputPath, buildArtifacts, logger }) => {
		logger.instance.info(
			"Using:",
			logger.instance.color.blue("Cloudflare Worker Adapter"),
			{
				silent: logger.silent,
			},
		);

		const wranglerConfig = await writeWranglerConfig({
			configPath,
			outputPath,
			options,
			prepareArtifacts,
			target: "build",
		});
		if (wranglerConfig.generatedConfigPath) {
			logger.instance.info(
				"Wrangler config generated:",
				logger.instance.color.green(
					toDisplayPath(wranglerConfig.generatedConfigPath),
				),
				{
					silent: logger.silent,
				},
			);
		}

		const workerHandlers = renderWorkerHandlers(buildArtifacts.custom);

		return {
			entries: {
				[constants.ENTRY]: `import build from "${buildModuleId}";
import { createWorker } from "@lucidcms/runtime-cloudflare/entry";
${workerHandlers.imports}

export default createWorker(build, ${workerHandlers.handlers});
`,
			},
			bundle: {
				// Resolve packages' Worker builds, as Wrangler does, rather than their Node builds.
				conditions: ["workerd", "worker", "import", "default"],
				splitting: false,
				alias: {
					"cross-fetch": "cross-fetch/dist/browser-ponyfill.js",
				},
				plugins: [importMetaUrlPolyfill],
			},
			runtimeContext: getRuntimeContext({
				server: "cloudflare",
				compiled: true,
			}),
		};
	};

export default buildCommand;
