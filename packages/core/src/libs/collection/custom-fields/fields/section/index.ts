import { createValueFieldTypeGenerator } from "../../../type-gen/custom-field.js";
import { sectionFieldConfig } from "./config.js";
import SectionCustomField from "./custom-field.js";

export default {
	config: sectionFieldConfig,
	class: SectionCustomField,
	fetchRefs: null,
	validateInput: null,
	formatRef: null,
	clientTypeGen: createValueFieldTypeGenerator("null"),
};
