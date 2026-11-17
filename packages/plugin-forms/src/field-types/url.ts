import { copy, z } from "@lucidcms/core";
import defineFormFieldType from "../define-form-field-type.js";

/** A web address beginning with http:// or https://. */
export default defineFormFieldType({
	key: "url",
	label: copy("admin:plugin.forms.field.url.label"),
	control: "url",
	schema: () =>
		z
			.string("Enter a web address.")
			.trim()
			.pipe(
				z.url({
					protocol: /^https?$/,
					error: "Enter a web address beginning with http:// or https://.",
				}),
			),
});
