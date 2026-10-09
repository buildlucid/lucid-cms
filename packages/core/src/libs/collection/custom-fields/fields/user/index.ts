import { createValueFieldTypeGenerator } from "../../../type-gen/custom-field.js";
import { formatIntegerFilterValue } from "../../utils/filter-values.js";
import parseListToolValue from "../../utils/parse-list-tool-value.js";
import { userFieldConfig } from "./config.js";
import UserCustomField from "./custom-field.js";
import validateUserInputData from "./validate-input.js";

export default {
	config: userFieldConfig,
	class: UserCustomField,
	validateInput: validateUserInputData,
	formatFilterValue: formatIntegerFilterValue,
	parseToolValue: parseListToolValue,
	contentTypeGen: createValueFieldTypeGenerator("number[]"),
};
