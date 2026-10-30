import { createValueFieldTypeGenerator } from "../../../type-gen/custom-field.js";
import type { ContentChildren, FieldConfig } from "../../types.js";
import { collapsibleFieldConfig } from "./config.js";
import CollapsibleCustomField from "./custom-field.js";

export default {
	config: collapsibleFieldConfig,
	class: CollapsibleCustomField,
	validateInput: null,
	contentTypeGen: createValueFieldTypeGenerator("null"),
	contentChildren: (config: FieldConfig<"collapsible">): ContentChildren => ({
		fields: config.fields,
		output: config.output,
	}),
};
