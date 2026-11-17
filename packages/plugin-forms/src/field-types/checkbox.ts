import { copy, z } from "@lucidcms/core";
import defineFormFieldType from "../define-form-field-type.js";

/** What a ticked box posts: `on` from a plain form, or true from a script. */
const ticked = ["on", "true", "1", "yes"];

/** One box to tick, such as agreeing to terms. Required boxes must be ticked. */
export default defineFormFieldType({
	key: "checkbox",
	label: copy("admin:plugin.forms.field.checkbox.label"),
	control: "checkbox",
	without: ["placeholder", "defaultValue"],
	schema: () =>
		z
			.union([z.boolean(), z.string()], "Tick the box.")
			.transform((value) =>
				typeof value === "string" ? ticked.includes(value) : value,
			),
});
