import { createValueFieldTypeGenerator } from "../../../type-gen/custom-field.js";
import { linkFieldConfig } from "./config.js";
import LinkCustomField from "./custom-field.js";

export default {
	config: linkFieldConfig,
	class: LinkCustomField,
	fetchRefs: null,
	validateInput: null,
	formatRef: null,
	clientTypeGen: createValueFieldTypeGenerator(
		"{ url: string | null; target: string | null; label: string | null; } | null",
	),
};
