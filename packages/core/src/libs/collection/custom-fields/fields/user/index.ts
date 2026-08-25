import { createValueFieldTypeGenerator } from "../../../type-gen/custom-field.js";
import { formatIntegerFilterValue } from "../../utils/filter-values.js";
import { userFieldConfig } from "./config.js";
import UserCustomField from "./custom-field.js";
import validateUserInputData from "./validate-input.js";

export default {
	config: userFieldConfig,
	class: UserCustomField,
	validateInput: validateUserInputData,
	formatFilterValue: formatIntegerFilterValue,
	contentTypeGen: createValueFieldTypeGenerator("number[]"),
};
