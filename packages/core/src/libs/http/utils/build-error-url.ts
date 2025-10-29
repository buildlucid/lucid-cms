import type { LucidErrorData } from "../../../types/errors.js";

/**
 * Build a url with error information appended as query params
 */
const buildErrorURL = (baseUrl: string, err: LucidErrorData): string => {
	try {
		const url = new URL(baseUrl);

		if (err.name) url.searchParams.set("errorName", err.name);
		if (err.message) url.searchParams.set("errorMessage", err.message);

		return url.toString();
	} catch (_e) {
		return baseUrl;
	}
};

export default buildErrorURL;
