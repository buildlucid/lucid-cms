import { createValueFieldTypeGenerator } from "../../../type-gen/custom-field.js";
import type { ContentChildren, FieldConfig } from "../../types.js";
import { tabFieldConfig } from "./config.js";
import TabCustomField from "./custom-field.js";

export default {
	config: tabFieldConfig,
	class: TabCustomField,
	validateInput: null,
	contentTypeGen: createValueFieldTypeGenerator("null"),
	contentChildren: (config: FieldConfig<"tab">): ContentChildren => ({
		fields: config.fields,
		output: "inline",
	}),
};
