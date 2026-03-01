import { getCookie } from "hono/cookie";
import { verify } from "hono/jwt";
import constants from "../../../constants/constants.js";
import cacheKeys from "../../../libs/kv-adapter/cache-keys.js";
import { UserTokensRepository } from "../../../libs/repositories/index.js";
import T from "../../../translations/index.js";
import type { LucidHonoContext } from "../../../types/hono.js";
import hashUserToken from "../../../utils/helpers/hash-user-token.js";
import type { ServiceResponse } from "../../../utils/services/types.js";
import { authServices } from "../../index.js";
import revokeUserTokens from "./revoke-user-tokens.js";

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

		const decode = (await verify(_refresh, config.secrets.refreshToken)) as {
			id: number;
		};
		const hashedRefreshToken = hashUserToken(_refresh);

		const tokenRes = await UserTokens.selectSingle({
			select: [
				"user_id",
				"expiry_date",
				"revoked_at",
				"revoke_reason",
				"replaced_by_token_id",
			],
			where: [
				{
					key: "token",
					operator: "=",
					value: hashedRefreshToken,
				},
				{
					key: "token_type",
					operator: "=",
					value: constants.userTokens.refresh,
				},
			],
		});
		if (tokenRes.error) return tokenRes;

		if (!tokenRes.data || tokenRes.data.user_id !== decode.id) {
			return {
				error: {
					type: "authorisation",
					name: T("refresh_token_error_name"),
					message: T("no_refresh_token_found"),
				},
				data: undefined,
			};
		}

		if (tokenRes.data.revoked_at !== null) {
			if (tokenRes.data.replaced_by_token_id !== null) {
				await revokeUserTokens(
					{
						db: { client: config.db.client },
						config: config,
						queue: c.get("queue"),
						env: c.get("env"),
						kv: c.get("kv"),
						requestUrl: c.req.url,
					},
					{
						userId: tokenRes.data.user_id,
						revokeReason: constants.refreshTokenRevokeReasons.reuseDetected,
					},
				);

				const [refreshRes, accessRes] = await Promise.all([
					authServices.refreshToken.clearToken(c, {
						revokeReason: constants.refreshTokenRevokeReasons.reuseDetected,
					}),
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

			return {
				error: {
					type: "authorisation",
					name: T("refresh_token_error_name"),
					message: T("no_refresh_token_found"),
				},
				data: undefined,
			};
		}

		if (!tokenRes.data.expiry_date) {
			return {
				error: {
					type: "authorisation",
					name: T("refresh_token_error_name"),
					message: T("no_refresh_token_found"),
				},
				data: undefined,
			};
		}

		const expiryMs = new Date(tokenRes.data.expiry_date).getTime();
		if (Number.isNaN(expiryMs) || expiryMs <= Date.now()) {
			return {
				error: {
					type: "authorisation",
					name: T("refresh_token_error_name"),
					message: T("no_refresh_token_found"),
				},
				data: undefined,
			};
		}

		const kv = c.get("kv");
		const kvEntry = await kv.get<{ user_id: number }>(
			cacheKeys.auth.refresh(_refresh),
			{ hash: true },
		);

		if (kvEntry && kvEntry.user_id === tokenRes.data.user_id) {
			return {
				error: undefined,
				data: { user_id: kvEntry.user_id },
			};
		}

		await kv.set(
			cacheKeys.auth.refresh(_refresh),
			{ user_id: tokenRes.data.user_id },
			{ expirationTtl: constants.refreshTokenExpiration, hash: true },
		);

		return {
			error: undefined,
			data: {
				user_id: tokenRes.data.user_id,
			},
		};
	} catch (_err) {
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
