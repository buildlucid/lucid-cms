import T from "../../../translations/index.js";
import z from "zod";
import type { CustomFieldValidateResponse } from "../types.js";

const zodSafeParse = (
	value: unknown,
	schema: z.ZodTypeAny,
): CustomFieldValidateResponse => {
	const response = schema.safeParse(value);
	if (response?.success) {
		return {
			valid: true,
		};
	}

	const errorMessage = z.prettifyError(response.error);

	return {
		valid: false,
		message:
			errorMessage ?? T("an_unknown_error_occurred_validating_the_field"),
	};
};

export default zodSafeParse;
