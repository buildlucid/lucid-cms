import { copy, z } from "@lucidcms/core";
import defineFormFieldType from "../define-form-field-type.js";

/** A calendar date, as `YYYY-MM-DD`. */
export default defineFormFieldType({
	key: "date",
	label: copy("admin:plugin.forms.field.date.label"),
	control: "date",
	without: ["placeholder"],
	schema: () => z.iso.date("Enter a date."),
});
