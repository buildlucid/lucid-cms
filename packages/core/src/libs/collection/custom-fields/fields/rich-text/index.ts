import { createValueFieldTypeGenerator } from "../../../type-gen/custom-field.js";
import { richTextFieldConfig } from "./config.js";
import RichTextCustomField from "./custom-field.js";
import validateRichTextInputData from "./validate-input.js";

export default {
	config: richTextFieldConfig,
	class: RichTextCustomField,
	fetchRefs: null,
	validateInput: validateRichTextInputData,
	formatRef: null,
	contentTypeGen: createValueFieldTypeGenerator(
		"Record<string, unknown> | null",
	),
};
