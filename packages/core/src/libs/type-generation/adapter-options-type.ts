import constants from "../../constants/constants.js";
import type { GenerateTypesResult } from "./types.js";

const generatedAdapterOptionsImport = "LucidAdapterOptions";

/**
 * Generates adapter option typing keyed by the configured adapter package path.
 */
const generateAdapterOptionsTypes = async (props: {
	adapterFrom?: string;
}): Promise<GenerateTypesResult | undefined> => {
	if (!props.adapterFrom) {
		return undefined;
	}

	return {
		module: constants.typeGeneration.modules.coreTypes,
		types: `interface AdapterOptionsByPath { ${JSON.stringify(props.adapterFrom)}: ${generatedAdapterOptionsImport}; }`,
		imports: `import type { AdapterOptionsType as ${generatedAdapterOptionsImport} } from "${props.adapterFrom}/types";`,
	};
};

export default generateAdapterOptionsTypes;
