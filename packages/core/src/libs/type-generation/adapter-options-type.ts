import constants from "../../constants/constants.js";
import type { TypeGenerationContribution } from "./types.js";

const generatedAdapterOptionsImport = "LucidAdapterOptions";

/**
 * Generates adapter option typing keyed by the configured adapter module.
 */
const generateAdapterOptionsTypes = async (props: {
	adapterModule?: string;
}): Promise<TypeGenerationContribution | undefined> => {
	if (!props.adapterModule) {
		return undefined;
	}

	return {
		imports: [
			`import type { AdapterOptionsType as ${generatedAdapterOptionsImport} } from "${props.adapterModule}/types";`,
		],
		moduleAugmentations: [
			{
				module: constants.typeGeneration.modules.coreTypes,
				declarations: [
					`interface AdapterOptionsByModule { ${JSON.stringify(props.adapterModule)}: ${generatedAdapterOptionsImport}; }`,
				],
			},
		],
	};
};

export default generateAdapterOptionsTypes;
