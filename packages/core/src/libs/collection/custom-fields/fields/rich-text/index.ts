import { richTextFieldConfig } from "./config.js";
import RichTextCustomField from "./custom-field.js";

export default {
	config: richTextFieldConfig,
	class: RichTextCustomField,
	fetchRefs: null,
	validateInput: null,
	formatRef: null,
};
