import path from "node:path";
import { pathToFileURL } from "node:url";
import constants from "../../constants/constants.js";
import type { Config } from "../../types/config.js";
import { LucidError } from "../../utils/errors/index.js";
import collectModuleFiles from "../../utils/helpers/collect-module-files.js";
import { resolveSourcePath } from "../../utils/helpers/resolve-source-path.js";
import type { Seed, SeedSource } from "./types.js";

const validateSeedName = (name: string, origin: string) => {
	if (!constants.seeds.nameRegex.test(name)) {
		throw new LucidError({
			message: `Invalid seed name "${name}". Seed names may contain lowercase letters, numbers, hyphens and underscores, with optional colon-delimited namespaces such as "pages:example".`,
			data: { origin },
		});
	}
};

/**
 * Loads configured seed sources and the optional project `seeds/` directory.
 * Plugins can register namespaced inline entries while projects can use files,
 * directories, package subpaths or file URLs just like migration sources.
 */
const loadSeeds = async (props: {
	sources?: SeedSource[];
	projectRoot?: string;
}): Promise<Record<string, Seed>> => {
	const filePaths = new Set<string>();
	const inlineSources: Array<{ name: string; seed: Seed }> = [];

	for (const source of props.sources ?? []) {
		if (typeof source === "object" && !(source instanceof URL)) {
			inlineSources.push(source);
			continue;
		}

		const sourcePath = await resolveSourcePath(source, {
			projectRoot: props.projectRoot,
			label: "Seed source",
		});
		for (const filePath of await collectModuleFiles(sourcePath, {
			label: "Seed source",
		})) {
			filePaths.add(filePath);
		}
	}

	if (props.projectRoot) {
		for (const filePath of await collectModuleFiles(
			path.join(props.projectRoot, constants.seeds.projectDirectory),
			{ label: "Seed source", optional: true },
		)) {
			filePaths.add(filePath);
		}
	}

	const seeds: Record<string, Seed> = {};
	const seedOrigins: Record<string, string> = {};
	const addSeed = (name: string, seed: Seed, origin: string) => {
		if (seedOrigins[name]) {
			throw new LucidError({
				message: `Duplicate seed name "${name}". Seed names must be unique across all seed sources.`,
				data: { origins: [seedOrigins[name], origin] },
			});
		}

		seeds[name] = seed;
		seedOrigins[name] = origin;
	};

	for (const filePath of filePaths) {
		const fileName = path.basename(filePath);
		const name = fileName.slice(
			0,
			fileName.length - path.extname(fileName).length,
		);
		validateSeedName(name, filePath);

		//* cache-busted so edits are picked up across config reloads
		const seedModule: { default?: unknown } = await import(
			/*! @vite-ignore */
			`${pathToFileURL(filePath).href}?t=${Date.now()}`
		);
		if (typeof seedModule.default !== "function") {
			throw new LucidError({
				message: `Invalid seed file "${fileName}". Seed files must default export a seed created with the "defineSeed" helper.`,
				data: { filePath },
			});
		}

		addSeed(name, seedModule.default as Seed, filePath);
	}

	for (const source of inlineSources) {
		const origin = `inline source "${source.name}"`;
		validateSeedName(source.name, origin);
		addSeed(source.name, source.seed, origin);
	}

	return seeds;
};

/** Loads all seed sources from resolved config and project conventions. */
export const prepareSeeds = (config: Config, projectRoot?: string) =>
	loadSeeds({ sources: config.seeds.sources, projectRoot });

export default loadSeeds;
