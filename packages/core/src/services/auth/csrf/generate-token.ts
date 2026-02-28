import crypto from "node:crypto";
import { setCookie } from "hono/cookie";
import constants from "../../../constants/constants.js";
import type { LucidHonoContext } from "../../../types/hono.js";
import { isRequestSecure } from "../../../utils/helpers/index.js";
import type { ServiceResponse } from "../../../utils/services/types.js";

const generateToken = async (c: LucidHonoContext): ServiceResponse<string> => {
	const token = crypto.randomBytes(32).toString("hex");

	setCookie(c, constants.cookies.csrf, token, {
		maxAge: constants.csrfExpiration,
		httpOnly: true,
		secure: isRequestSecure(c),
		sameSite: "strict",
		path: "/",
	});

	return {
		error: undefined,
		data: token,
	};
};

export default generateToken;
