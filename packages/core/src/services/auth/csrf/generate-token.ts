import crypto from "node:crypto";
import constants from "../../../constants/constants.js";
import { setCookie } from "hono/cookie";
import type { ServiceResponse } from "../../../utils/services/types.js";
import type { LucidHonoContext } from "../../../types/hono.js";

const generateToken = async (c: LucidHonoContext): ServiceResponse<string> => {
	const token = crypto.randomBytes(32).toString("hex");

	setCookie(c, constants.cookies.csrf, token, {
		maxAge: constants.csrfExpiration,
		httpOnly: true,
		secure: c.req.url.startsWith("https://"),
		sameSite: "strict",
		path: "/",
	});

	return {
		error: undefined,
		data: token,
	};
};

export default generateToken;
