import { text } from "../../libs/i18n/index.js";
import type { LucidErrorData } from "../../types.js";

const errorTypeDefaults = (error: LucidErrorData) => {
	switch (error.type) {
		case "validation": {
			return {
				status: 400,
				name: error.name ?? text.server("core.errors.validation.name"),
				message: error.message ?? text.server("core.errors.validation.message"),
			};
		}
		case "authorisation": {
			return {
				status: 401,
				name: error.name ?? text.server("core.errors.authorization.name"),
				message:
					error.message ?? text.server("core.authorization.error.message"),
			};
		}
		case "forbidden": {
			return {
				status: 403,
				name: error.name ?? text.server("core.errors.forbidden.name"),
				message: error.message ?? text.server("core.forbidden.error.message"),
			};
		}
		default: {
			return {
				status: error.status,
				name: error.name ?? text.server("core.errors.default.name"),
				message: error.message ?? text.server("core.errors.default.message"),
			};
		}
	}
};

export default errorTypeDefaults;
