import type { PublicErrorData } from "@lucidcms/types";
import type { LucidErrorData } from "../../../types/errors.js";
import LucidAPIError from "../../../utils/errors/lucid-api-error.js";
import translateErrorData from "../../../utils/errors/translate-error-data.js";
import type { ServiceContext } from "../../../utils/services/types.js";

/** Formats a service error for an import row, the way the API would format it as a response. */
const formatItemError = (
	context: ServiceContext,
	error: LucidErrorData,
): PublicErrorData => {
	const translated = translateErrorData(
		new LucidAPIError(error).error,
		context.translate,
	);
	return {
		name: translated.name,
		message: translated.message,
		status: translated.status,
		code: translated.code,
		errors: translated.errors,
	};
};

export default formatItemError;
