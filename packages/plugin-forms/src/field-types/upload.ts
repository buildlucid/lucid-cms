import { copy, field } from "@lucidcms/core";
import defineFormFieldType from "../define-form-field-type.js";

/** Files visitors attach. Stored as private media unless the field's `public` setting is on. */
export default defineFormFieldType({
	key: "upload",
	label: copy("admin:plugin.forms.field.upload.label"),
	control: "file",
	without: ["placeholder", "defaultValue"],
	settings: [
		field.text("accept", {
			details: {
				label: copy("admin:plugin.forms.settings.accept.label"),
				description: copy("admin:plugin.forms.settings.accept.description"),
				placeholder: "pdf, png, jpg",
			},
			localized: false,
		}),
		field.number("maxFiles", {
			details: { label: copy("admin:plugin.forms.settings.max.files.label") },
			default: 1,
			ui: { width: 6 },
		}),
		field.number("maxSizeMb", {
			details: {
				label: copy("admin:plugin.forms.settings.max.size.label"),
				description: copy("admin:plugin.forms.settings.max.size.description"),
			},
			ui: { width: 6 },
		}),
		field.checkbox("public", {
			details: {
				label: copy("admin:plugin.forms.settings.public.label"),
				description: copy("admin:plugin.forms.settings.public.description"),
			},
		}),
	],
});
