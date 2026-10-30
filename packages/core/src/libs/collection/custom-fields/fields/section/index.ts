import { createValueFieldTypeGenerator } from "../../../type-gen/custom-field.js";
import type { ContentChildren, FieldConfig } from "../../types.js";
import { sectionFieldConfig } from "./config.js";
import SectionCustomField from "./custom-field.js";

export default {
	config: sectionFieldConfig,
	class: SectionCustomField,
	validateInput: null,
	contentTypeGen: createValueFieldTypeGenerator("null"),
	contentChildren: (config: FieldConfig<"section">): ContentChildren => ({
		fields: config.fields,
		output: config.output,
	}),
};
