import { createValueFieldTypeGenerator } from "../../../type-gen/custom-field.js";
import plainTextTranslation from "../../utils/plain-text-translation.js";
import { textareaFieldConfig } from "./config.js";
import TextareaCustomField from "./custom-field.js";

export default {
	config: textareaFieldConfig,
	class: TextareaCustomField,
	validateInput: null,
	contentTypeGen: createValueFieldTypeGenerator("string | null"),
	translation: plainTextTranslation,
};
