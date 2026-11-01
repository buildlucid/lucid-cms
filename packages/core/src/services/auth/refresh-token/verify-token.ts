import { getCookie } from "hono/cookie";
import { verify } from "hono/jwt";
import constants from "../../../constants/constants.js";
import createServiceContext from "../../../libs/http/utils/create-service-context.js";
import { copy } from "../../../libs/i18n/index.js";
import { UserTokensRepository } from "../../../libs/repositories/index.js";
import type { LucidHonoContext } from "../../../types/hono.js";
import hashUserToken from "../../../utils/helpers/hash-user-token.js";
import type { ServiceResponse } from "../../../utils/services/types.js";
import clearAccessToken from "../access-token/clear-token.js";
import needsTwoFactorSetup from "../two-factor/needs-setup.js";
import clearRefreshToken from "./clear-token.js";
import revokeUserTokens from "./revoke-user-tokens.js";

type RefreshedSession = {
	user_id: number;
	/** Last login or reauthentication time, preserved during refresh. */
	authTime: number;
	/** Whether the session came from a login provider, which skips two-factor authentication. */
	provider: boolean;
};

/**
 * Consumes the refresh token once. Reuse revokes all sessions; newly required two-factor setup
 * forces a fresh login.
 */
const verifyToken = async (
	c: LucidHonoContext,
): ServiceResponse<RefreshedSession> => {
	try {
		const _refresh = getCookie(c, constants.cookies.refreshToken);

		if (!_refresh) {
			return {
				error: {
					type: "authorisation",
					name: copy("server:core.auth.refresh.token.error.name"),
					message: copy("server:core.auth.refresh.token.missing"),
				},
				data: undefined,
			};
		}

		const context = createServiceContext(c);
		const UserTokens = new UserTokensRepository(context.db);

		const decode = (await verify(
			_refresh,
			context.config.secrets.refreshToken,
			constants.jwt.algorithm,
		)) as {
			id: number;
			authTime?: number;
			provider?: boolean;
		};
		//* tokens without the time have to confirm it's the user before security changes
		const authTime = typeof decode.authTime === "number" ? decode.authTime : 0;
		const hashedRefreshToken = hashUserToken(_refresh);

		const tokenRes = await UserTokens.selectSingle({
			select: ["user_id", "expiry_date", "revoked_at", "replaced_by_token_id"],
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
					name: copy("server:core.auth.refresh.token.error.name"),
					message: copy("server:core.auth.refresh.token.missing"),
				},
				data: undefined,
			};
		}

		const userId = tokenRes.data.user_id;
		//* Token reuse revokes all sessions.
		const endAllSessions = async (): ServiceResponse<RefreshedSession> => {
			await revokeUserTokens(context, {
				userId,
				revokeReason: constants.refreshTokenRevokeReasons.reuseDetected,
			});

			const [refreshRes, accessRes] = await Promise.all([
				clearRefreshToken(c, {
					revokeReason: constants.refreshTokenRevokeReasons.reuseDetected,
				}),
				clearAccessToken(c),
			]);
			if (refreshRes.error) return refreshRes;
			if (accessRes.error) return accessRes;

			return {
				error: {
					type: "authorisation",
					name: copy("server:core.auth.refresh.token.error.name"),
					message: copy("server:core.auth.refresh.token.error.message"),
				},
				data: undefined,
			};
		};

		if (tokenRes.data.revoked_at !== null) {
			if (tokenRes.data.replaced_by_token_id !== null) return endAllSessions();

			return {
				error: {
					type: "authorisation",
					name: copy("server:core.auth.refresh.token.error.name"),
					message: copy("server:core.auth.refresh.token.missing"),
				},
				data: undefined,
			};
		}

		const expiryMs = tokenRes.data.expiry_date
			? new Date(tokenRes.data.expiry_date).getTime()
			: Number.NaN;
		if (Number.isNaN(expiryMs) || expiryMs <= Date.now()) {
			return {
				error: {
					type: "authorisation",
					name: copy("server:core.auth.refresh.token.error.name"),
					message: copy("server:core.auth.refresh.token.missing"),
				},
				data: undefined,
			};
		}

		const provider = decode.provider === true;
		if (!provider) {
			const setupRes = await needsTwoFactorSetup(context, { userId });
			if (setupRes.error) return setupRes;
			if (setupRes.data) {
				const [refreshRes, accessRes] = await Promise.all([
					clearRefreshToken(c, {
						revokeReason: constants.refreshTokenRevokeReasons.twoFactorRequired,
					}),
					clearAccessToken(c),
				]);
				if (refreshRes.error) return refreshRes;
				if (accessRes.error) return accessRes;

				return {
					error: {
						type: "authorisation",
						name: copy("server:core.auth.refresh.token.error.name"),
						message: copy("server:core.auth.refresh.token.error.message"),
					},
					data: undefined,
				};
			}
		}

		const consumeRes = await UserTokens.consumeRefreshToken({
			token: hashedRefreshToken,
		});
		if (consumeRes.error) return consumeRes;
		if (!consumeRes.data) return endAllSessions();

		return {
			error: undefined,
			data: {
				user_id: userId,
				authTime,
				provider,
			},
		};
	} catch (_err) {
		const [refreshRes, accessRes] = await Promise.all([
			clearRefreshToken(c),
			clearAccessToken(c),
		]);
		if (refreshRes.error) return refreshRes;
		if (accessRes.error) return accessRes;

		return {
			error: {
				type: "authorisation",
				name: copy("server:core.auth.refresh.token.error.name"),
				message: copy("server:core.auth.refresh.token.error.message"),
			},
			data: undefined,
		};
	}
};

export default verifyToken;
