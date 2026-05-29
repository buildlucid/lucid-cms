import { getCookie } from "hono/cookie";
import constants from "../../../constants/constants.js";
import { copy } from "../../../libs/i18n/index.js";
import type { LucidHonoContext } from "../../../types/hono.js";
import type { ServiceResponse } from "../../../utils/services/types.js";

const verifyToken = (
	c: LucidHonoContext,
): Awaited<ServiceResponse<undefined>> => {
	const cookieCSRF = getCookie(c, constants.cookies.csrf);
	const headerCSRF = c.req.header(constants.headers.csrf);

	if (!cookieCSRF || !headerCSRF) {
		return {
			error: {
				type: "forbidden",
				code: "csrf",
				message: copy("server:core.security.csrf.validation.failed"),
			},
			data: undefined,
		};
	}
	if (cookieCSRF !== headerCSRF) {
		return {
			error: {
				type: "forbidden",
				code: "csrf",
				message: copy("server:core.security.csrf.validation.failed"),
			},
			data: undefined,
		};
	}

	return {
		error: undefined,
		data: undefined,
	};
};

export default verifyToken;
