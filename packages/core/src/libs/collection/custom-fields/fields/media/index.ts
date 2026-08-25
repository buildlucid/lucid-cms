import { createValueFieldTypeGenerator } from "../../../type-gen/custom-field.js";
import { formatIntegerFilterValue } from "../../utils/filter-values.js";
import { mediaFieldConfig } from "./config.js";
import MediaCustomField from "./custom-field.js";
import validateMediaInputData from "./validate-input.js";

export default {
	config: mediaFieldConfig,
	class: MediaCustomField,
	validateInput: validateMediaInputData,
	formatFilterValue: formatIntegerFilterValue,
	contentTypeGen: createValueFieldTypeGenerator("number[]"),
};
