import { createValueFieldTypeGenerator } from "../../../type-gen/custom-field.js";
import { formatIntegerFilterValue } from "../../utils/filter-values.js";
import { numberFieldConfig } from "./config.js";
import NumberCustomField from "./custom-field.js";

export default {
	config: numberFieldConfig,
	class: NumberCustomField,
	validateInput: null,
	formatFilterValue: formatIntegerFilterValue,
	contentTypeGen: createValueFieldTypeGenerator("number | null"),
};
