import { createValueFieldTypeGenerator } from "../../../type-gen/custom-field.js";
import { jsonFieldConfig } from "./config.js";
import JsonCustomField from "./custom-field.js";

export default {
	config: jsonFieldConfig,
	class: JsonCustomField,
	validateInput: null,
	contentTypeGen: createValueFieldTypeGenerator(
		"Record<string, unknown> | unknown[] | null",
	),
};
