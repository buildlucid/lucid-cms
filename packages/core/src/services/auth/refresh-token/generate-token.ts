import { sign } from "hono/jwt";
import constants from "../../../constants/constants.js";
import Repository from "../../../libs/repositories/index.js";
import clearToken from "./clear-token.js";
import { setCookie } from "hono/cookie";
import { randomBytes } from "node:crypto";
import type { ServiceResponse } from "../../../utils/services/types.js";
import type { LucidHonoContext } from "../../../types/hono.js";

const generateToken = async (
	c: LucidHonoContext,
	userId: number,
): ServiceResponse<{ tokenId: number }> => {
	const clearRes = await clearToken(c);
	if (clearRes.error) return clearRes;

	const config = c.get("config");

	const UserTokens = Repository.get("user-tokens", config.db.client, config.db);

	const now = Date.now();
	const nonce = randomBytes(8).toString("hex");

	const token = await sign(
		{
			id: userId,
			exp: Math.floor(now / 1000) + constants.refreshTokenExpiration,
			iat: Math.floor(now / 1000),
			nonce: nonce,
		},
		config.keys.refreshTokenSecret,
	);

	setCookie(c, constants.cookies.refreshToken, token, {
		maxAge: constants.refreshTokenExpiration,
		httpOnly: true,
		secure: c.req.url.startsWith("https://"),
		sameSite: "strict",
		path: "/",
	});

	const createTokenRes = await UserTokens.createSingle({
		data: {
			user_id: userId,
			token: token,
			token_type: "refresh",
			expiry_date: new Date(
				Date.now() + constants.refreshTokenExpiration * 1000, // convert to ms
			).toISOString(),
		},
		returning: ["id"],
		validation: {
			enabled: true,
		},
	});
	if (createTokenRes.error) return createTokenRes;

	return {
		error: undefined,
		data: {
			tokenId: createTokenRes.data.id,
		},
	};
};

export default generateToken;
