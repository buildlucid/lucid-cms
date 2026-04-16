import { unlink } from "node:fs/promises";
import {
	stripAdapterExportPlugin,
	stripImportsPlugin,
} from "@lucidcms/core/build";
import type { BuildHandler } from "@lucidcms/core/types";
import { build } from "rolldown";
import constants from "../constants.js";
import getRuntimeContext from "../services/get-runtime-context.js";
import prepareAdditionalWorkerEntries from "../services/prepare-additional-worker-entries.js";
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
		const additionalWorkerEntries = prepareAdditionalWorkerEntries(
			buildArtifacts.custom,
		);

		const allEntries = [
			{
				key: constants.ENTRY_FILE,
				filepath: `${outputPath}/temp-entry.${extension}`,
				...mainWorkerEntry,
			},
			...additionalWorkerEntries.map((entry) => ({
				...entry,
				filepath: `${outputPath}/${entry.key}.${extension}`,
			})),
		];

		const tempFiles = await writeWorkerEntries(allEntries);

		//* build files
		await Promise.all(
			Object.entries({
				...allEntries.reduce<Record<string, string>>((acc, entry) => {
					acc[entry.key] = entry.filepath;
					return acc;
				}, {}),
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
						stripAdapterExportPlugin("cloudflareAdapter"),
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
