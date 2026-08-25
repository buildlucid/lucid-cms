import { createValueFieldTypeGenerator } from "../../../type-gen/custom-field.js";
import { repeaterFieldConfig } from "./config.js";
import RepeaterCustomField from "./custom-field.js";

export default {
	config: repeaterFieldConfig,
	class: RepeaterCustomField,
	validateInput: null,
	contentTypeGen: createValueFieldTypeGenerator("null"),
};
