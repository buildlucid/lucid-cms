import constants from "../../constants/constants.js";
import type { GenerateTypesResult } from "./types.js";

const generatedAdapterOptionsImport = "LucidAdapterOptions";

/**
 * Generates adapter option typing keyed by the configured adapter module.
 */
const generateAdapterOptionsTypes = async (props: {
	adapterModule?: string;
}): Promise<GenerateTypesResult | undefined> => {
	if (!props.adapterModule) {
		return undefined;
	}

	return {
		module: constants.typeGeneration.modules.coreTypes,
		types: `interface AdapterOptionsByModule { ${JSON.stringify(props.adapterModule)}: ${generatedAdapterOptionsImport}; }`,
		imports: `import type { AdapterOptionsType as ${generatedAdapterOptionsImport} } from "${props.adapterModule}/types";`,
	};
};

export default generateAdapterOptionsTypes;
