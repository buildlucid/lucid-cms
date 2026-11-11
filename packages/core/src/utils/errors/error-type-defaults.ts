import type { LucidErrorData } from "../../exports/types.js";
import { copy } from "../../libs/i18n/copy.js";

/** Fills in the status, name and message an error type implies, keeping any the error already has. */
const errorTypeDefaults = (error: LucidErrorData) => {
	switch (error.type) {
		case "validation": {
			return {
				status: error.status ?? 400,
				name: error.name ?? copy("server:core.errors.validation.name"),
				message: error.message ?? copy("server:core.errors.validation.message"),
			};
		}
		case "authorisation": {
			return {
				status: error.status ?? 401,
				name: error.name ?? copy("server:core.errors.authorization.name"),
				message:
					error.message ?? copy("server:core.authorization.error.message"),
			};
		}
		case "forbidden": {
			return {
				status: error.status ?? 403,
				name: error.name ?? copy("server:core.errors.forbidden.name"),
				message: error.message ?? copy("server:core.forbidden.error.message"),
			};
		}
		default: {
			return {
				status: error.status,
				name: error.name ?? copy("server:core.errors.default.name"),
				message: error.message ?? copy("server:core.errors.default.message"),
			};
		}
	}
};

export default errorTypeDefaults;
