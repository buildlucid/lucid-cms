import constants from "../../constants/constants.js";
import type { TypeGenerationContribution } from "./types.js";

const generatedDatabaseOptionsImport = "LucidDatabaseAdapterOptions";

/**
 * Generates database option typing keyed by the configured database adapter module.
 */
const generateDatabaseOptionsTypes = async (props: {
	databaseModule?: string;
}): Promise<TypeGenerationContribution | undefined> => {
	if (!props.databaseModule) {
		return undefined;
	}

	return {
		imports: [
			`import type { AdapterOptionsType as ${generatedDatabaseOptionsImport} } from "${props.databaseModule}/types";`,
		],
		moduleAugmentations: [
			{
				module: constants.typeGeneration.modules.coreTypes,
				declarations: [
					`interface DatabaseAdapterOptionsByModule { ${JSON.stringify(props.databaseModule)}: ${generatedDatabaseOptionsImport}; }`,
				],
			},
		],
	};
};

export default generateDatabaseOptionsTypes;
