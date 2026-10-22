import { readdir, rm } from "node:fs/promises";
import path from "node:path";
import { gzipSync } from "node:zlib";
import { build } from "rolldown";
import constants from "../../constants/constants.js";
import { LucidError } from "../../utils/errors/index.js";
import type { RuntimeBuild } from "../runtime/types.js";
import createBuildModuleSource from "./create-build-module-source.js";
import createServerModulesPlugin from "./create-server-modules-plugin.js";
import isPackageImport from "./is-package-import.js";
import prepareConfigArtifacts from "./prepare-config-artifacts.js";
import resolveAlias from "./resolve-alias.js";

/** Bundles runtime entries and `lucid:build` into the output directory, returning summed JavaScript chunk sizes in raw and gzip bytes. */
const bundleServer = async (props: {
	configPath: string;
	outputPath: string;
	runtimeEntrypoint?: string;
	build: RuntimeBuild;
}) => {
	const outputPath = path.resolve(props.outputPath);
	const dataDirectory = path.join(outputPath, constants.build.directory);
	const configArtifacts = await prepareConfigArtifacts({
		configPath: props.configPath,
		outputPath,
		runtimeEntrypoint: props.runtimeEntrypoint,
	});
	const { entries, bundle = {} } = props.build;
	const serverModules = createServerModulesPlugin({
		entries,
		buildModuleSource: createBuildModuleSource({ configArtifacts }),
		dataDirectory,
		bundle,
	});

	const entryNames = Object.keys(entries);
	// Without code splitting, each entry inlines its imports and needs a build of its own.
	const groups =
		bundle.splitting === false
			? entryNames.map((name) => [name])
			: [entryNames];

	try {
		const chunks = await Promise.all(
			groups.map(async (group) => {
				const result = await build({
					input: Object.fromEntries(
						group.map((name) => [
							name,
							`${constants.build.entryModulePrefix}${name}`,
						]),
					),
					platform: bundle.platform ?? "node",
					resolve: {
						conditionNames: bundle.conditions,
					},
					external:
						bundle.packages === "external"
							? (id) => isPackageImport(id) && !resolveAlias(id, bundle.alias)
							: undefined,
					plugins: [serverModules, ...(bundle.plugins ?? [])],
					output: {
						dir: outputPath,
						format: "esm",
						minify: true,
						codeSplitting: bundle.splitting ?? true,
						chunkFileNames: `${constants.build.directory}/${constants.build.chunksDirectory}/[name]-[hash].js`,
					},
				});

				const output = result.output.filter((item) => item.type === "chunk");
				// The minifier writes nothing for code it can't parse, rather than failing.
				const empty = output.find((chunk) => chunk.code.length === 0);
				if (empty) {
					throw new LucidError({
						message: `The server build wrote an empty ${empty.fileName}.`,
					});
				}
				return output;
			}),
		);

		if (bundle.buildData !== "external") {
			await Promise.all(
				Object.values(constants.build.dataFiles).map((file) =>
					rm(path.join(dataDirectory, file), { force: true }),
				),
			);
		}

		let size = 0;
		let gzipSize = 0;
		for (const chunk of chunks.flat()) {
			size += Buffer.byteLength(chunk.code);
			gzipSize += gzipSync(chunk.code).byteLength;
		}
		return { size, gzipSize };
	} finally {
		await Promise.all(
			Object.values(configArtifacts).map((file) => rm(file, { force: true })),
		);
		if ((await readdir(dataDirectory)).length === 0) {
			await rm(dataDirectory, { recursive: true });
		}
	}
};

export default bundleServer;
