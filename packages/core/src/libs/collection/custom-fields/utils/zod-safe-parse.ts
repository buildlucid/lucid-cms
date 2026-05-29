import type z from "zod";
import tidyZodError from "../../../../utils/errors/tidy-zod-errors.js";
import { getZodIssueText, text } from "../../../i18n/index.js";
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

	const translatableIssueText = response.error.issues
		.map(getZodIssueText)
		.find((message) => message !== undefined);
	if (translatableIssueText) {
		return {
			valid: false,
			message: translatableIssueText,
		};
	}

	const message = modifyMessage(tidyZodError(response.error));

	return {
		valid: false,
		message: text.server("core.fields.validation.errors.unknown", {
			defaultMessage: message,
		}),
	};
};

export default zodSafeParse;
