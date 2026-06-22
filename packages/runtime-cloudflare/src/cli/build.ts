import { unlink } from "node:fs/promises";
import {
	getConfigArtifactImportPaths,
	prepareConfigArtifacts,
} from "@lucidcms/core/build";
import type {
	BuildHandler,
	RuntimePrepareArtifacts,
} from "@lucidcms/core/types";
import { build } from "rolldown";
import constants from "../constants.js";
import getRuntimeContext from "../services/get-runtime-context.js";
import prepareMainWorkerEntry from "../services/prepare-worker-entry.js";
import writeWorkerEntries from "../services/write-worker-entries.js";
import writeWranglerConfig from "../services/write-wrangler-config.js";
import type { AdapterOptions } from "../types.js";
import toDisplayPath from "../utils/path-to-display.js";

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

		try {
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

			const configArtifacts = await prepareConfigArtifacts({
				configPath,
				outputPath,
			});
			const configArtifactImports = getConfigArtifactImportPaths(".");
			const configIsTs = configPath.endsWith(".ts");
			const extension = configIsTs ? "ts" : "js";

			const mainWorkerEntry = prepareMainWorkerEntry(
				configArtifactImports,
				buildArtifacts.custom,
			);

			const entryFilepath = `${outputPath}/temp-entry.${extension}`;

			const tempFiles = await writeWorkerEntries([
				{
					filepath: entryFilepath,
					...mainWorkerEntry,
				},
			]);

			//* build files
			await Promise.all(
				Object.entries({
					[constants.ENTRY_FILE]: entryFilepath,
					...buildArtifacts.compile,
				}).map(([key, inputPath]) =>
					build({
						input: { [key]: inputPath },
						output: {
							dir: outputPath,
							format: "esm",
							minify: true,
							codeSplitting: false,
						},
						platform: "node",
						resolve: {
							alias: {
								"cross-fetch": "cross-fetch/dist/browser-ponyfill.js",
							},
						},
						plugins: [
							{
								name: "import-meta-polyfill",
								renderChunk(code: string) {
									return code.replace(
										/import\.meta\.url/g,
										'"file:///server.js"',
									);
								},
							},
						],
					}),
				),
			);

			//* cleanup temp files
			await Promise.all(
				[
					...tempFiles,
					...Object.values(configArtifacts),
					...Object.values(buildArtifacts.compile),
				].map((file) => unlink(file)),
			);

			return {
				runtimeContext: getRuntimeContext({
					server: "cloudflare",
					compiled: true,
				}),
			};
		} catch (error) {
			logger.instance.error(
				error instanceof Error
					? error.message
					: "An error occurred building via the Cloudflare Worker Adapter",
				{
					silent: logger.silent,
				},
			);
			throw error;
		}
	};

export default buildCommand;
