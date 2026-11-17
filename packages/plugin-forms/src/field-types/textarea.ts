import { copy, field } from "@lucidcms/core";
import defineFormFieldType from "../define-form-field-type.js";
import maxLengthSetting from "./max-length-setting.js";
import textSchema from "./text-schema.js";

/** Several lines of text. */
export default defineFormFieldType({
	key: "textarea",
	label: copy("admin:plugin.forms.field.textarea.label"),
	control: "textarea",
	settings: [
		field.number("rows", {
			details: { label: copy("admin:plugin.forms.settings.rows.label") },
			ui: { width: 6 },
		}),
		maxLengthSetting(6),
	],
	schema: textSchema,
});
