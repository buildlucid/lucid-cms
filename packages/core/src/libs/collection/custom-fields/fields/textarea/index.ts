import { createValueFieldTypeGenerator } from "../../../type-gen/custom-field.js";
import { textareaFieldConfig } from "./config.js";
import TextareaCustomField from "./custom-field.js";

export default {
	config: textareaFieldConfig,
	class: TextareaCustomField,
	fetchRefs: null,
	validateInput: null,
	formatRef: null,
	clientTypeGen: createValueFieldTypeGenerator("string | null"),
};
