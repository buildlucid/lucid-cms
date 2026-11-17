import { copy, z } from "@lucidcms/core";
import defineFormFieldType from "../define-form-field-type.js";

/** A phone number, kept as typed apart from a check that it looks like one. */
export default defineFormFieldType({
	key: "phone",
	label: copy("admin:plugin.forms.field.phone.label"),
	control: "tel",
	schema: () =>
		z
			.string("Enter a phone number.")
			.trim()
			.regex(/^[0-9+()\-.\s]{3,30}$/, "Enter a valid phone number."),
});
