import { copy } from "@lucidcms/core";
import defineFormFieldType from "../define-form-field-type.js";
import textSchema from "./text-schema.js";

/** A value visitors don't see, sent with the form, such as a campaign name. */
export default defineFormFieldType({
	key: "hidden",
	label: copy("admin:plugin.forms.field.hidden.label"),
	control: "hidden",
	without: ["placeholder", "required", "width", "help"],
	schema: textSchema,
});
