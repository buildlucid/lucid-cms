import { unlink } from "node:fs/promises";
import {
	stripAdapterExportPlugin,
	stripImportsPlugin,
} from "@lucidcms/core/build";
import type { BuildHandler } from "@lucidcms/core/types";
import { build } from "rolldown";
import constants from "../constants.js";
import getRuntimeContext from "../services/get-runtime-context.js";
import prepareMainWorkerEntry from "../services/prepare-worker-entry.js";
import writeWorkerEntries from "../services/write-worker-entries.js";

const buildCommand: BuildHandler = async ({
	configPath,
	outputPath,
	outputRelativeConfigPath,
	buildArtifacts,
	logger,
}) => {
	logger.instance.info(
		"Using:",
		logger.instance.color.blue("Cloudflare Worker Adapter"),
		{
			silent: logger.silent,
		},
	);

	try {
		const configIsTs = configPath.endsWith(".ts");
		const extension = configIsTs ? "ts" : "js";

		const mainWorkerEntry = prepareMainWorkerEntry(
			outputRelativeConfigPath,
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
					treeshake: {
						moduleSideEffects: (id) => {
							const noSideEffects = [
								"kv-adapter/adapters/better-sqlite",
								"image-processor/processors/sharp",
								"media-adapter/adapters/file-system",
							];
							return !noSideEffects.some((path) => id.includes(path));
						},
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
						stripAdapterExportPlugin("adapter"),
						stripImportsPlugin("cloudflare-adapter", [
							"wrangler",
							"@hono/node-server",
							"@hono/node-server/serve-static",
							"rolldown",
						]),
					],
					external: ["sharp", "ws", "better-sqlite3", "file-type"],
				}),
			),
		);

		//* cleanup temp files
		await Promise.all(
			[...tempFiles, ...Object.values(buildArtifacts.compile)].map((file) =>
				unlink(file),
			),
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
