import { linkFieldConfig } from "./config.js";
import LinkCustomField from "./custom-field.js";

export default {
	config: linkFieldConfig,
	class: LinkCustomField,
	fetchRefs: null,
	validateInput: null,
	formatRef: null,
};
