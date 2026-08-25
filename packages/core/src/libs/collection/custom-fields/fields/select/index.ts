import { createValueFieldTypeGenerator } from "../../../type-gen/custom-field.js";
import { selectFieldConfig } from "./config.js";
import SelectCustomField from "./custom-field.js";

export default {
	config: selectFieldConfig,
	class: SelectCustomField,
	validateInput: null,
	contentTypeGen: createValueFieldTypeGenerator("string | null"),
};
