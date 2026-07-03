import { createValueFieldTypeGenerator } from "../../../type-gen/custom-field.js";
import { codeFieldConfig } from "./config.js";
import CodeCustomField from "./custom-field.js";

export default {
	config: codeFieldConfig,
	class: CodeCustomField,
	fetchRefs: null,
	validateInput: null,
	formatRef: null,
	clientTypeGen: createValueFieldTypeGenerator(
		"{ language: string; value: string } | null",
	),
};
