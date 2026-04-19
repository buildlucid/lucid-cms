import constants from "../../constants/constants.js";
import type { GenerateTypesResult } from "./types.js";

const generatedDatabaseOptionsImport = "LucidDatabaseAdapterOptions";

/**
 * Generates database option typing keyed by the configured database adapter module.
 */
const generateDatabaseOptionsTypes = async (props: {
	databaseModule?: string;
}): Promise<GenerateTypesResult | undefined> => {
	if (!props.databaseModule) {
		return undefined;
	}

	return {
		module: constants.typeGeneration.modules.coreTypes,
		types: `interface DatabaseAdapterOptionsByModule { ${JSON.stringify(props.databaseModule)}: ${generatedDatabaseOptionsImport}; }`,
		imports: `import type { AdapterOptionsType as ${generatedDatabaseOptionsImport} } from "${props.databaseModule}/types";`,
	};
};

export default generateDatabaseOptionsTypes;
