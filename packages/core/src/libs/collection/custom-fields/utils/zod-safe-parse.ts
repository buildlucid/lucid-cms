import type z from "zod";
import tidyZodError from "../../../../utils/errors/tidy-zod-errors.js";
import { serverText } from "../../../i18n/index.js";
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

	const message = modifyMessage(tidyZodError(response.error));

	return {
		valid: false,
		message: serverText("core.fields.validation.errors.unknown", {
			fallback: message,
			priority: message,
		}),
	};
};

export default zodSafeParse;
