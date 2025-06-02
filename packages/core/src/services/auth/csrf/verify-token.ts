import T from "../../../translations/index.js";
import constants from "../../../constants/constants.js";
import { getCookie } from "hono/cookie";
import type { ServiceResponse } from "../../../utils/services/types.js";
import type { LucidHonoContext } from "../../../types/hono.js";

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
				message: T("failed_to_validate_csrf_token"),
			},
			data: undefined,
		};
	}
	if (cookieCSRF !== headerCSRF) {
		return {
			error: {
				type: "forbidden",
				code: "csrf",
				message: T("failed_to_validate_csrf_token"),
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
