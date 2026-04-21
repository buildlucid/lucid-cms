import { createValueFieldTypeGenerator } from "../../../type-gen/custom-field.js";
import { checkboxFieldConfig } from "./config.js";
import CheckboxCustomField from "./custom-field.js";

export default {
	config: checkboxFieldConfig,
	class: CheckboxCustomField,
	fetchRefs: null,
	validateInput: null,
	formatRef: null,
	clientTypeGen: createValueFieldTypeGenerator("boolean | null"),
};
