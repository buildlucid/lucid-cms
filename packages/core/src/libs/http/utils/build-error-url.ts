import type { LucidErrorData } from "../../../types/errors.js";
import type { Translator } from "../../i18n/index.js";

/**
 * Build a url with error information appended as query params
 */
const buildErrorURL = (
	baseUrl: string,
	err: LucidErrorData,
	translator: Translator,
): string => {
	try {
		const url = new URL(baseUrl);

		if (err.name) {
			url.searchParams.set("errorName", translator(err.name) ?? "");
		}
		if (err.message) {
			url.searchParams.set("errorMessage", translator(err.message) ?? "");
		}

		return url.toString();
	} catch (_e) {
		return baseUrl;
	}
};

export default buildErrorURL;
