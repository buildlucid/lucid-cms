import constants from "../../constants/constants.js";
import { LucidError } from "../../utils/errors/index.js";
import { seedSchema } from "../config/definition-schemas.js";
import collectResourceModules from "../resources/collect-resource-modules.js";
import type { Seed, SeedDefinition } from "./types.js";

const validateSeedName = (name: string, origin: string) => {
	if (!constants.seeds.nameRegex.test(name)) {
		throw new LucidError({
			message: `Invalid seed name "${name}". Seed names may contain lowercase letters, numbers, hyphens and underscores, with optional colon-delimited namespaces such as "pages:example".`,
			data: { origin },
		});
	}
};

/** Validates imported seed files and inline definitions into seeds keyed by name. */
const collectSeeds = (props: {
	definitions: SeedDefinition[];
	modules: Array<{ path: string; module: { default?: unknown } }>;
}): Record<string, Seed> =>
	collectResourceModules({
		label: "seed",
		helper: "defineSeed",
		schema: seedSchema,
		validateName: validateSeedName,
		modules: props.modules,
		definitions: props.definitions.map(({ name, seed }) => ({
			name,
			value: seed,
		})),
	});

export default collectSeeds;
