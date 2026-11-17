import { z } from "@lucidcms/core";
import readNumber from "../shared/read-number.js";
import type { FormField } from "../types.js";

/** Longest answer a text field takes when its `maxLength` setting names none. */
const DEFAULT_MAX_LENGTH = 10_000;

/** A trimmed text answer no longer than the field's `maxLength`. */
const textSchema = (formField: FormField) => {
	const maxLength =
		readNumber(formField.settings, "maxLength") ?? DEFAULT_MAX_LENGTH;

	return z
		.string("Enter text.")
		.trim()
		.max(maxLength, `Enter ${maxLength} characters or fewer.`);
};

export default textSchema;
