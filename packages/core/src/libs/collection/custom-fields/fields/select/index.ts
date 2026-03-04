import { selectFieldConfig } from "./config.js";
import SelectCustomField from "./custom-field.js";

export default {
	config: selectFieldConfig,
	class: SelectCustomField,
	fetchRefs: null,
	validateInput: null,
	formatRef: null,
};
