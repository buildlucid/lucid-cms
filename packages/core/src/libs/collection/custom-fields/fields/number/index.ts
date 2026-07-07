import { createValueFieldTypeGenerator } from "../../../type-gen/custom-field.js";
import { formatIntegerFilterValue } from "../../utils/filter-values.js";
import { numberFieldConfig } from "./config.js";
import NumberCustomField from "./custom-field.js";

export default {
	config: numberFieldConfig,
	class: NumberCustomField,
	fetchRefs: null,
	validateInput: null,
	formatRef: null,
	formatFilterValue: formatIntegerFilterValue,
	clientTypeGen: createValueFieldTypeGenerator("number | null"),
};
