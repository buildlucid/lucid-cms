import { deleteCookie } from "hono/cookie";
import constants from "../../../constants/constants.js";
import type { LucidHonoContext } from "../../../types/hono.js";
import type { ServiceResponse } from "../../../utils/services/types.js";

const clearToken = (
	c: LucidHonoContext,
): Awaited<ServiceResponse<undefined>> => {
	deleteCookie(c, constants.cookies.csrf, { path: "/" });

	return {
		error: undefined,
		data: undefined,
	};
};

export default clearToken;
