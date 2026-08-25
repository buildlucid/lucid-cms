import { createValueFieldTypeGenerator } from "../../../type-gen/custom-field.js";
import { sectionFieldConfig } from "./config.js";
import SectionCustomField from "./custom-field.js";

export default {
	config: sectionFieldConfig,
	class: SectionCustomField,
	validateInput: null,
	contentTypeGen: createValueFieldTypeGenerator("null"),
};
