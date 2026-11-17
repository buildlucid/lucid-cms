import { copy, z } from "@lucidcms/core";
import defineFormFieldType from "../define-form-field-type.js";

/** An email address. */
export default defineFormFieldType({
	key: "email",
	label: copy("admin:plugin.forms.field.email.label"),
	control: "email",
	schema: () =>
		z
			.string("Enter an email address.")
			.trim()
			.pipe(z.email("Enter a valid email address.")),
});
