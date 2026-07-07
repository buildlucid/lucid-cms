import { createValueFieldTypeGenerator } from "../../../type-gen/custom-field.js";
import { formatBooleanFilterValue } from "../../utils/filter-values.js";
import { checkboxFieldConfig } from "./config.js";
import CheckboxCustomField from "./custom-field.js";

export default {
	config: checkboxFieldConfig,
	class: CheckboxCustomField,
	fetchRefs: null,
	validateInput: null,
	formatRef: null,
	formatFilterValue: formatBooleanFilterValue,
	clientTypeGen: createValueFieldTypeGenerator("boolean | null"),
};
