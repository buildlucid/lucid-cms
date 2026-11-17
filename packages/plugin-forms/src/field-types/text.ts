import { copy } from "@lucidcms/core";
import defineFormFieldType from "../define-form-field-type.js";
import maxLengthSetting from "./max-length-setting.js";
import textSchema from "./text-schema.js";

/** One line of text. */
export default defineFormFieldType({
	key: "text",
	label: copy("admin:plugin.forms.field.text.label"),
	control: "text",
	settings: [maxLengthSetting(12)],
	schema: textSchema,
});
