import constants from "../../../constants/constants.js";
import { deleteCookie } from "hono/cookie";
import type { ServiceResponse } from "../../../utils/services/types.js";
import type { LucidHonoContext } from "../../../types/hono.js";

const clearToken = (
	c: LucidHonoContext,
): Awaited<ServiceResponse<undefined>> => {
	deleteCookie(c, constants.cookies.accessToken, { path: "/" });
	return {
		error: undefined,
		data: undefined,
	};
};

export default clearToken;
