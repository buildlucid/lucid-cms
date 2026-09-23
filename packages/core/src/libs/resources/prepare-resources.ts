import fs from "node:fs/promises";
import path from "node:path";
import type { LucidConfig } from "../../types/config.js";
import { LucidError } from "../../utils/errors/index.js";
import { resolveSourcePath } from "../../utils/helpers/resolve-source-path.js";
import { collectResourceFiles } from "./collect-files.js";
import { defaultDirectories, emptyResourceFiles } from "./defaults.js";
import { ResourceDirectoriesSchema, ResourceSourcesSchema } from "./schema.js";
import {
	type PreparedResources,
	type ResourceFile,
	type ResourceKind,
	type ResourceSources,
	resourceKinds,
} from "./types.js";

const moduleKinds = new Set<ResourceKind>(["migrations", "seeds"]);

/** Resolves public destinations and protects the build directory and Lucid's own assets. */
const getPublicOutput = (
	file: ResourceFile,
	output: string | undefined,
	mappedFile: boolean,
) => {
	const name =
		output === undefined
			? file.name
			: path.posix.normalize(
					mappedFile ? output : path.posix.join(output, file.name),
				);
	if (
		name.startsWith("../") ||
		path.posix.isAbsolute(name) ||
		name.includes("\\") ||
		name === ".." ||
		name === "." ||
		name === "lucid" ||
		name.startsWith("lucid/")
	) {
		throw new LucidError({
			message: `Public resource "${file.path}" targets an invalid or reserved output "${name}".`,
		});
	}
	return name;
};

export const emptyPreparedResources = (): PreparedResources => ({
	files: emptyResourceFiles(),
	watch: [],
});

/** Collects each resource type concurrently, retaining source order for asset overrides. */
export const prepareResources = async (
	config: LucidConfig,
	projectRoot: string,
): Promise<PreparedResources> => {
	const files = emptyResourceFiles();
	const watch = new Set<string>();
	const directories = ResourceDirectoriesSchema.parse(config.directories);
	const sourceMaps: ResourceSources[] = [
		...(config.plugins ?? []).map((plugin) =>
			ResourceSourcesSchema.parse(plugin.sources),
		),
		ResourceSourcesSchema.parse(config.sources),
	];

	const results = await Promise.allSettled(
		resourceKinds.map(async (kind) => {
			const seen = new Set<string>();
			const addSource = async (
				sourcePath: string,
				optional: boolean,
				output?: string,
			) => {
				watch.add(sourcePath);
				const sourceFiles = await collectResourceFiles(sourcePath, {
					optional,
					modules: moduleKinds.has(kind),
					onDirectory: (directory) => watch.add(directory),
				});
				const mappedFile =
					output !== undefined && (await fs.stat(sourcePath)).isFile();
				for (const file of sourceFiles) {
					const name =
						kind === "public"
							? getPublicOutput(file, output, mappedFile)
							: file.name;
					const identity =
						kind === "public" ? `${file.path}:${name}` : file.path;
					if (seen.has(identity)) continue;
					seen.add(identity);
					files[kind].push({ ...file, name });
					watch.add(file.path);
				}
			};

			for (const sources of sourceMaps) {
				for (const entry of sources[kind] ?? []) {
					const mapped = typeof entry === "object" && !(entry instanceof URL);
					const source = mapped ? entry.input : entry;
					const sourcePath = await resolveSourcePath(source, {
						projectRoot,
						label: `${kind} source`,
					});
					await addSource(sourcePath, false, mapped ? entry.output : undefined);
				}
			}

			const directory = directories[kind] ?? defaultDirectories[kind];
			if (directory !== false)
				await addSource(
					path.resolve(projectRoot, directory),
					directories[kind] === undefined,
				);
		}),
	);

	for (const result of results) {
		if (result.status === "rejected") throw result.reason;
	}

	return { files, watch: [...watch].sort() };
};
