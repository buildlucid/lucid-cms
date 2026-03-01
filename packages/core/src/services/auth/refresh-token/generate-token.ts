import { randomBytes } from "node:crypto";
import { getCookie, setCookie } from "hono/cookie";
import { sign } from "hono/jwt";
import constants from "../../../constants/constants.js";
import cacheKeys from "../../../libs/kv-adapter/cache-keys.js";
import { UserTokensRepository } from "../../../libs/repositories/index.js";
import type { LucidHonoContext } from "../../../types/hono.js";
import hashUserToken from "../../../utils/helpers/hash-user-token.js";
import { isRequestSecure } from "../../../utils/helpers/index.js";
import type { ServiceResponse } from "../../../utils/services/types.js";
import clearToken from "./clear-token.js";

const generateToken = async (
	c: LucidHonoContext,
	userId: number,
): ServiceResponse<{ tokenId: number }> => {
	const existingRefreshToken = getCookie(c, constants.cookies.refreshToken);

	const clearRes = await clearToken(c, {
		revokeReason: constants.refreshTokenRevokeReasons.rotated,
		consume: true,
	});
	if (clearRes.error) return clearRes;

	const config = c.get("config");

	const UserTokens = new UserTokensRepository(config.db.client, config.db);

	const now = Date.now();
	const nonce = randomBytes(8).toString("hex");

	const token = await sign(
		{
			id: userId,
			exp: Math.floor(now / 1000) + constants.refreshTokenExpiration,
			iat: Math.floor(now / 1000),
			nonce: nonce,
		},
		config.secrets.refreshToken,
	);
	const hashedToken = hashUserToken(token);

	const createTokenRes = await UserTokens.createSingle({
		data: {
			user_id: userId,
			token: hashedToken,
			token_type: constants.userTokens.refresh,
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

	if (existingRefreshToken) {
		const hashedExistingRefreshToken = hashUserToken(existingRefreshToken);
		const updateRotatedTokenRes = await UserTokens.updateMultiple({
			data: {
				replaced_by_token_id: createTokenRes.data.id,
			},
			where: [
				{
					key: "token",
					operator: "=",
					value: hashedExistingRefreshToken,
				},
				{
					key: "token_type",
					operator: "=",
					value: constants.userTokens.refresh,
				},
			],
		});
		if (updateRotatedTokenRes.error) return updateRotatedTokenRes;
	}

	setCookie(c, constants.cookies.refreshToken, token, {
		maxAge: constants.refreshTokenExpiration,
		httpOnly: true,
		secure: isRequestSecure(c),
		sameSite: "strict",
		path: "/",
	});

	const kv = c.get("kv");
	await kv.set(
		cacheKeys.auth.refresh(token),
		{ user_id: userId },
		{ expirationTtl: constants.refreshTokenExpiration, hash: true },
	);

	return {
		error: undefined,
		data: {
			tokenId: createTokenRes.data.id,
		},
	};
};

export default generateToken;
