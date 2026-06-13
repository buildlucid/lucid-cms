import { randomBytes } from "node:crypto";
import { setCookie } from "hono/cookie";
import { sign } from "hono/jwt";
import constants from "../../../constants/constants.js";
import type {
	LucidAccessToken,
	LucidHonoContext,
} from "../../../types/hono.js";
import { isRequestSecure } from "../../../utils/helpers/index.js";
import type { ServiceResponse } from "../../../utils/services/types.js";

const generateToken = async (
	c: LucidHonoContext,
	userId: number,
): ServiceResponse<undefined> => {
	try {
		const config = c.get("config");

		const now = Date.now();
		const nonce = randomBytes(8).toString("hex");

		const token = await sign(
			{
				id: userId,
				exp: Math.floor(now / 1000) + constants.accessTokenExpiration,
				iat: Math.floor(now / 1000),
				nonce: nonce,
			} satisfies LucidAccessToken,
			config.secrets.accessToken,
			constants.jwt.algorithm,
		);

		setCookie(c, constants.cookies.accessToken, token, {
			maxAge: constants.accessTokenExpiration,
			httpOnly: true,
			secure: isRequestSecure(c),
			sameSite: "strict",
			path: "/",
		});

		return {
			error: undefined,
			data: undefined,
		};
	} catch (_err) {
		return {
			error: {
				type: "authorisation",
			},
			data: undefined,
		};
	}
};

export default generateToken;
