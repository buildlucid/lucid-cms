import { createValueFieldTypeGenerator } from "../../../type-gen/custom-field.js";
import { tabFieldConfig } from "./config.js";
import TabCustomField from "./custom-field.js";

export default {
	config: tabFieldConfig,
	class: TabCustomField,
	validateInput: null,
	contentTypeGen: createValueFieldTypeGenerator("null"),
};
