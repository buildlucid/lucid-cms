import { createValueFieldTypeGenerator } from "../../../type-gen/custom-field.js";
import { textFieldConfig } from "./config.js";
import TextCustomField from "./custom-field.js";

export default {
	config: textFieldConfig,
	class: TextCustomField,
	validateInput: null,
	contentTypeGen: createValueFieldTypeGenerator("string | null"),
};
