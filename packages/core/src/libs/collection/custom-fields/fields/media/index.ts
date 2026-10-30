import { createValueFieldTypeGenerator } from "../../../type-gen/custom-field.js";
import { formatIntegerFilterValue } from "../../utils/filter-values.js";
import parseListToolValue from "../../utils/parse-list-tool-value.js";
import { mediaFieldConfig } from "./config.js";
import MediaCustomField from "./custom-field.js";
import restrictMediaValidationData from "./restrict-validation-data.js";
import validateMediaInputData from "./validate-input.js";

export default {
	config: mediaFieldConfig,
	class: MediaCustomField,
	validateInput: validateMediaInputData,
	restrictValidationData: restrictMediaValidationData,
	formatFilterValue: formatIntegerFilterValue,
	parseToolValue: parseListToolValue,
	contentTypeGen: createValueFieldTypeGenerator("MediaFieldValue"),
};
