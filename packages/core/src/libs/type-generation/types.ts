import type constants from "../../constants/constants.js";

export type GenerateTypesResult = {
	imports?: string;
	types: string;
	module: (typeof constants.typeGeneration.modules)[keyof typeof constants.typeGeneration.modules];
};
