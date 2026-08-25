import { createValueFieldTypeGenerator } from "../../../type-gen/custom-field.js";
import { linkFieldConfig } from "./config.js";
import LinkCustomField from "./custom-field.js";

export default {
	config: linkFieldConfig,
	class: LinkCustomField,
	validateInput: null,
	contentTypeGen: createValueFieldTypeGenerator(
		"{ url: string | null; target: string | null; label: string | null; } | null",
	),
};
