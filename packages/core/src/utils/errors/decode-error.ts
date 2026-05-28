import constants from "../../constants/constants.js";
import { translateServer } from "../../libs/i18n/index.js";
import type { PublicErrorData } from "../../types.js";
import { LucidAPIError } from "./index.js";
import translateErrorData from "./translate-error-data.js";

const decodeError = (error: Error): PublicErrorData => {
	if (error instanceof LucidAPIError) {
		return translateErrorData({
			name: error.error.name,
			message: error.error.message,
			status: error.error.status,
			errors: error.error.errors,
			code: error.error.code,
		});
	}

	// @ts-expect-error
	if (error?.statusCode === 429) {
		return {
			code: "rate_limit",
			name: translateServer("core.rate.limit.error.name"),
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
