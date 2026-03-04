import { jsonFieldConfig } from "./config.js";
import JsonCustomField from "./custom-field.js";

export default {
	config: jsonFieldConfig,
	class: JsonCustomField,
	fetchRefs: null,
	validateInput: null,
	formatRef: null,
};
