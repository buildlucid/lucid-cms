import { copy, z } from "@lucidcms/core";
import defineFormFieldType from "../define-form-field-type.js";
import readOptions from "../shared/read-options.js";
import optionsSetting from "./options-setting.js";

/** Any number of choices from a list of checkboxes. */
export default defineFormFieldType({
	key: "checkboxes",
	label: copy("admin:plugin.forms.field.checkboxes.label"),
	control: "checkboxes",
	settings: [optionsSetting()],
	without: ["placeholder", "defaultValue"],
	schema: (formField) => {
		const values = readOptions(formField.settings).map(
			(option) => option.value,
		);

		//* a form with one box ticked posts a single value
		return z.preprocess(
			(value) => (typeof value === "string" ? [value] : value),
			z
				.array(
					z.string().refine((value) => values.includes(value), {
						error: "Choose from the options.",
						params: { code: "not_an_option" },
					}),
					"Choose from the options.",
				)
				.transform((chosen) => [...new Set(chosen)]),
		);
	},
});
