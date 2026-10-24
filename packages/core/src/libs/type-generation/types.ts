import type constants from "../../constants/constants.js";

export type TypeGenerationModule =
	(typeof constants.typeGeneration.modules)[keyof typeof constants.typeGeneration.modules];

export type TypeGenerationModuleAugmentation = {
	module: TypeGenerationModule;
	declarations: string[];
};

export type TypeGenerationContribution = {
	/** Extra files written beside the core types file, which its imports can read. */
	files?: TypeGenerationFile[];
	imports?: string[];
	declarations?: string[];
	moduleAugmentations: TypeGenerationModuleAugmentation[];
};

export type TypeGenerationFile = {
	filename: string;
	references?: string[];
	imports?: string[];
	declarations?: string[];
	moduleAugmentations?: TypeGenerationModuleAugmentation[];
	exportStub?: boolean;
};
