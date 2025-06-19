import T from "../../../translations/index.js";
import tidyZodError from "../../../utils/errors/tidy-zod-errors.js";
import type z from "zod/v4";
import type { CustomFieldValidateResponse } from "../types.js";

/**
 * Removes new lines, and "   →"
 */
export const modifyMessage = (errorMessage: string): string => {
	return errorMessage.replace(/\n/g, " ").trim().replaceAll("   →", " →");
};

/**
 * Parses zod errors for custom fields
 */
const zodSafeParse = (
	value: unknown,
	schema: z.ZodType,
): CustomFieldValidateResponse => {
	const response = schema.safeParse(value);
	if (response?.success) {
		return {
			valid: true,
		};
	}

	return {
		valid: false,
		message:
			modifyMessage(tidyZodError(response.error)) ??
			T("an_unknown_error_occurred_validating_the_field"),
	};
};

export default zodSafeParse;
