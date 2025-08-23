import T from "../../translations/index.js";
import type { LucidErrorData } from "../../types.js";

const errorTypeDefaults = (error: LucidErrorData) => {
	switch (error.type) {
		case "validation": {
			return {
				status: 400,
				name: error.name ?? T("validation_error"),
				message: error.message ?? T("validation_error_message"),
			};
		}
		case "authorisation": {
			return {
				status: 401,
				name: error.name ?? T("authorization_error"),
				message: error.message ?? T("authorization_error_message"),
			};
		}
		case "forbidden": {
			return {
				status: 403,
				name: error.name ?? T("forbidden_error"),
				message: error.message ?? T("forbidden_error_message"),
			};
		}
		default: {
			return {
				status: error.status,
				name: error.name,
				message: error.message,
			};
		}
	}
};

export default errorTypeDefaults;
