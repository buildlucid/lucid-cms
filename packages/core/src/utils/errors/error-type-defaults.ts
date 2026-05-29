import { copy } from "../../libs/i18n/index.js";
import type { LucidErrorData } from "../../types.js";

const errorTypeDefaults = (error: LucidErrorData) => {
	switch (error.type) {
		case "validation": {
			return {
				status: 400,
				name: error.name ?? copy("server:core.errors.validation.name"),
				message: error.message ?? copy("server:core.errors.validation.message"),
			};
		}
		case "authorisation": {
			return {
				status: 401,
				name: error.name ?? copy("server:core.errors.authorization.name"),
				message:
					error.message ?? copy("server:core.authorization.error.message"),
			};
		}
		case "forbidden": {
			return {
				status: 403,
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
