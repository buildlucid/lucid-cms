import { createValueFieldTypeGenerator } from "../../../type-gen/custom-field.js";
import { datetimeFieldConfig } from "./config.js";
import DatetimeCustomField from "./custom-field.js";

export default {
	config: datetimeFieldConfig,
	class: DatetimeCustomField,
	validateInput: null,
	contentTypeGen: createValueFieldTypeGenerator("string | null"),
};
