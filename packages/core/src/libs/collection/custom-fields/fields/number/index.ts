import { createValueFieldTypeGenerator } from "../../../type-gen/custom-field.js";
import { numberFieldConfig } from "./config.js";
import NumberCustomField from "./custom-field.js";

export default {
	config: numberFieldConfig,
	class: NumberCustomField,
	fetchRefs: null,
	validateInput: null,
	formatRef: null,
	clientTypeGen: createValueFieldTypeGenerator("number | null"),
};
