import T from "../../translations/index.js";
import { LucidAPIError } from "./index.js";
import constants from "../../constants/constants.js";
import type { LucidErrorData } from "../../types.js";

const decodeError = (error: Error): Exclude<LucidErrorData, "zod"> => {
	if (error instanceof LucidAPIError) {
		return {
			name: error.error.name,
			message: error.error.message,
			status: error.error.status,
			errors: error.error.errors,
			code: error.error.code,
		};
	}

	// @ts-expect-error
	if (error?.statusCode === 429) {
		return {
			code: "rate_limit",
			name: T("rate_limit_error_name"),
			message: error.message || constants.errors.message,
			status: 429,
		};
	}

	return {
		name: constants.errors.name,
		message: error.message || constants.errors.message,
		status: constants.errors.status,
		errors: constants.errors.errors,
		code: constants.errors.code,
	};
};

export default decodeError;
