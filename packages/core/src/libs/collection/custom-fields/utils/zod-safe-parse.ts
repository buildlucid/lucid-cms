import type z from "zod";
import LucidError from "../../../../utils/errors/lucid-error.js";
import tidyZodError from "../../../../utils/errors/tidy-zod-errors.js";
import isPlainObject from "../../../../utils/helpers/is-plain-object.js";
import { copy } from "../../../i18n/index.js";
import type { CustomFieldValidateResponse } from "../types.js";

/**
 * Removes new lines, and "   →"
 */
export const modifyMessage = (errorMessage: string): string => {
	return errorMessage.replace(/\n/g, " ").trim().replaceAll("   →", " →");
};

const valuesEqual = (left: unknown, right: unknown): boolean => {
	if (Object.is(left, right)) return true;
	if (Array.isArray(left) && Array.isArray(right)) {
		return (
			left.length === right.length &&
			left.every((value, index) => valuesEqual(value, right[index]))
		);
	}
	if (isPlainObject(left) && isPlainObject(right)) {
		const keys = Object.keys(left);
		return (
			keys.length === Object.keys(right).length &&
			keys.every(
				(key) =>
					Object.hasOwn(right, key) && valuesEqual(left[key], right[key]),
			)
		);
	}
	return false;
};

/**
 * Parses Zod errors for custom fields. Configured schemas must preserve the
 * submitted value because field validation does not write parsed output.
 */
const zodSafeParse = (
	value: unknown,
	schema: z.ZodType,
	options?: { preserveValue: boolean; fieldKey: string },
): CustomFieldValidateResponse => {
	const response = schema.safeParse(value);
	if (response?.success) {
		if (options?.preserveValue && !valuesEqual(value, response.data)) {
			throw new LucidError({
				message: `Validation for field "${options.fieldKey}" changed its value. Use validation constraints without transforms, coercion, defaults, or stripped properties.`,
			});
		}
		return {
			valid: true,
		};
	}

	const message = modifyMessage(tidyZodError(response.error));

	return {
		valid: false,
		message: copy.literal(message),
	};
};

export default zodSafeParse;
