import path from "node:path";
import { createJiti } from "jiti";
import constants from "../../constants/constants.js";
import { LucidError } from "../../utils/errors/index.js";
import { seedSchema } from "../config/definition-schemas.js";
import type { ResourceFile } from "../resources/types.js";
import type { Seed, SeedDefinition } from "./types.js";

const validateSeedName = (name: string, origin: string) => {
	if (!constants.seeds.nameRegex.test(name)) {
		throw new LucidError({
			message: `Invalid seed name "${name}". Seed names may contain lowercase letters, numbers, hyphens and underscores, with optional colon-delimited namespaces such as "pages:example".`,
			data: { origin },
		});
	}
};

/** Loads resolved seeds and explicit definitions when their command runs. */
const loadSeeds = async (props: {
	definitions?: SeedDefinition[];
	files?: ResourceFile[];
}): Promise<Record<string, Seed>> => {
	const loader = createJiti(import.meta.url, {
		fsCache: false,
		moduleCache: false,
		interopDefault: false,
	});
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

	for (const { path: filePath } of props.files ?? []) {
		const fileName = path.basename(filePath);
		const name = fileName.slice(
			0,
			fileName.length - path.extname(fileName).length,
		);

		const seedModule = await loader.import<{ default?: unknown }>(filePath);
		if (!("default" in seedModule)) continue;
		validateSeedName(name, filePath);

		const seed = seedSchema.safeParse(seedModule.default);
		if (!seed.success) {
			throw new LucidError({
				message: `Invalid seed file "${fileName}". Seed files must default export a seed created with the "defineSeed" helper.`,
				data: { filePath },
			});
		}

		addSeed(name, seed.data, filePath);
	}

	for (const source of props.definitions ?? []) {
		const origin = `inline source "${source.name}"`;
		validateSeedName(source.name, origin);
		addSeed(source.name, source.seed, origin);
	}

	return seeds;
};

export default loadSeeds;
