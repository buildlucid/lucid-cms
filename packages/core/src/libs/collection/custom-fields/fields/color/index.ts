import { createValueFieldTypeGenerator } from "../../../type-gen/custom-field.js";
import { colorFieldConfig } from "./config.js";
import ColorCustomField from "./custom-field.js";

export default {
	config: colorFieldConfig,
	class: ColorCustomField,
	fetchRefs: null,
	validateInput: null,
	formatRef: null,
	clientTypeGen: createValueFieldTypeGenerator("string | null"),
};
