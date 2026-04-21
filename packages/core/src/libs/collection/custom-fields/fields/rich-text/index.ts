import { createValueFieldTypeGenerator } from "../../../type-gen/custom-field.js";
import { richTextFieldConfig } from "./config.js";
import RichTextCustomField from "./custom-field.js";

export default {
	config: richTextFieldConfig,
	class: RichTextCustomField,
	fetchRefs: null,
	validateInput: null,
	formatRef: null,
	clientTypeGen: createValueFieldTypeGenerator(
		"Record<string, unknown> | null",
	),
};
