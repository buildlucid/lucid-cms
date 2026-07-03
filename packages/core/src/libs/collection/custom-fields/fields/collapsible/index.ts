import { createValueFieldTypeGenerator } from "../../../type-gen/custom-field.js";
import { collapsibleFieldConfig } from "./config.js";
import CollapsibleCustomField from "./custom-field.js";

export default {
	config: collapsibleFieldConfig,
	class: CollapsibleCustomField,
	fetchRefs: null,
	validateInput: null,
	formatRef: null,
	clientTypeGen: createValueFieldTypeGenerator("null"),
};
