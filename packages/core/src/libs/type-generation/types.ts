import type constants from "../../constants/constants.js";

export type TypeGenerationModule =
	(typeof constants.typeGeneration.modules)[keyof typeof constants.typeGeneration.modules];

export type TypeGenerationModuleAugmentation = {
	module: TypeGenerationModule;
	declarations: string[];
};

export type TypeGenerationContribution = {
	imports?: string[];
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
