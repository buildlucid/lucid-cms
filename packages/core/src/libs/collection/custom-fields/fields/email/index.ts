import { createValueFieldTypeGenerator } from "../../../type-gen/custom-field.js";
import { formatIntegerFilterValue } from "../../utils/filter-values.js";
import parseListToolValue from "../../utils/parse-list-tool-value.js";
import { emailFieldConfig } from "./config.js";
import EmailCustomField from "./custom-field.js";
import restrictEmailValidationData from "./restrict-validation-data.js";
import validateEmailInputData from "./validate-input.js";

export default {
	config: emailFieldConfig,
	class: EmailCustomField,
	validateInput: validateEmailInputData,
	restrictValidationData: restrictEmailValidationData,
	formatFilterValue: formatIntegerFilterValue,
	parseToolValue: parseListToolValue,
	contentTypeGen: createValueFieldTypeGenerator("EmailFieldValue"),
};
