import { createValueFieldTypeGenerator } from "../../../type-gen/custom-field.js";
import { formatNumberFilterValue } from "../../utils/filter-values.js";
import { rangeFieldConfig } from "./config.js";
import RangeCustomField from "./custom-field.js";

export default {
	config: rangeFieldConfig,
	class: RangeCustomField,
	fetchRefs: null,
	validateInput: null,
	formatRef: null,
	formatFilterValue: formatNumberFilterValue,
	clientTypeGen: createValueFieldTypeGenerator("number[]"),
};
