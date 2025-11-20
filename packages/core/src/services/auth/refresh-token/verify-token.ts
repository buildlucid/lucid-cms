import { getCookie } from "hono/cookie";
import { verify } from "hono/jwt";
import constants from "../../../constants/constants.js";
import cacheKeys from "../../../libs/kv-adapter/cache-keys.js";
import { UserTokensRepository } from "../../../libs/repositories/index.js";
import T from "../../../translations/index.js";
import type { LucidHonoContext } from "../../../types/hono.js";
import type { ServiceResponse } from "../../../utils/services/types.js";
import { authServices } from "../../index.js";

const verifyToken = async (
	c: LucidHonoContext,
): ServiceResponse<{
	user_id: number;
}> => {
	try {
		const _refresh = getCookie(c, constants.cookies.refreshToken);

		if (!_refresh) {
			return {
				error: {
					type: "authorisation",
					name: T("refresh_token_error_name"),
					message: T("no_refresh_token_found"),
				},
				data: undefined,
			};
		}

		const config = c.get("config");

		const UserTokens = new UserTokensRepository(config.db.client, config.db);

		const decode = (await verify(_refresh, config.keys.refreshTokenSecret)) as {
			id: number;
		};

		const kv = c.get("kv");
		const kvEntry = await kv.command.get<{ user_id: number }>(
			cacheKeys.auth.refresh(_refresh),
		);

		if (kvEntry && kvEntry.user_id === decode.id) {
			return {
				error: undefined,
				data: { user_id: kvEntry.user_id },
			};
		}

		const tokenRes = await UserTokens.selectSingle({
			select: ["id", "user_id"],
			where: [
				{
					key: "token",
					operator: "=",
					value: _refresh,
				},
				{
					key: "token_type",
					operator: "=",
					value: constants.userTokens.refresh,
				},
				{
					key: "user_id",
					operator: "=",
					value: decode.id,
				},
				{
					key: "expiry_date",
					operator: ">",
					value: new Date().toISOString(),
				},
			],
			validation: {
				enabled: true,
				defaultError: {
					type: "authorisation",
					name: T("refresh_token_error_name"),
					message: T("no_refresh_token_found"),
				},
			},
		});
		if (tokenRes.error) return tokenRes;

		if (!tokenRes.data.user_id) {
			return {
				error: {
					type: "authorisation",
					name: T("refresh_token_error_name"),
					message: T("no_refresh_token_found"),
				},
				data: undefined,
			};
		}

		await kv.command.set(
			cacheKeys.auth.refresh(_refresh),
			{ user_id: tokenRes.data.user_id },
			{ expirationTtl: constants.refreshTokenExpiration },
		);

		return {
			error: undefined,
			data: {
				user_id: tokenRes.data.user_id,
			},
		};
	} catch (err) {
		const [refreshRes, accessRes] = await Promise.all([
			authServices.refreshToken.clearToken(c),
			authServices.accessToken.clearToken(c),
		]);
		if (refreshRes.error) return refreshRes;
		if (accessRes.error) return accessRes;

		return {
			error: {
				type: "authorisation",
				name: T("refresh_token_error_name"),
				message: T("refresh_token_error_message"),
			},
			data: undefined,
		};
	}
};

export default verifyToken;
