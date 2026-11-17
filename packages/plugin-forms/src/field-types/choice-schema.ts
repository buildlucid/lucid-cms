import { z } from "@lucidcms/core";
import readOptions from "../shared/read-options.js";
import type { FormField } from "../types.js";

/** One of the field's `options`, by value. */
const choiceSchema = (formField: FormField) => {
	const values = readOptions(formField.settings).map((option) => option.value);

	return z
		.string("Choose an option.")
		.refine((value) => values.includes(value), {
			error: "Choose one of the options.",
			params: { code: "not_an_option" },
		});
};

export default choiceSchema;
