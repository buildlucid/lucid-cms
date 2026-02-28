import { deleteCookie, getCookie } from "hono/cookie";
import constants from "../../../constants/constants.js";
import cacheKeys from "../../../libs/kv-adapter/cache-keys.js";
import { UserTokensRepository } from "../../../libs/repositories/index.js";
import type { LucidHonoContext } from "../../../types/hono.js";
import type { ServiceResponse } from "../../../utils/services/types.js";

interface ClearTokenConfig {
	revokeReason?: string;
	consume?: boolean;
}

const clearToken = async (
	c: LucidHonoContext,
	options?: ClearTokenConfig,
): ServiceResponse<undefined> => {
	const _refresh = getCookie(c, constants.cookies.refreshToken);
	deleteCookie(c, constants.cookies.refreshToken, { path: "/" });

	if (!_refresh) {
		return {
			error: undefined,
			data: undefined,
		};
	}

	const config = c.get("config");
	const now = new Date().toISOString();

	const UserTokens = new UserTokensRepository(config.db.client, config.db);

	await c.get("kv").delete(cacheKeys.auth.refresh(_refresh), { hash: true });

	const updateTokenRes = await UserTokens.updateMultiple({
		data: {
			revoked_at: now,
			revoke_reason:
				options?.revokeReason ?? constants.refreshTokenRevokeReasons.logout,
			expiry_date: now,
			...(options?.consume ? { consumed_at: now } : {}),
		},
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
				key: "revoked_at",
				operator: "is",
				value: null,
			},
		],
	});
	if (updateTokenRes.error) return updateTokenRes;

	return {
		error: undefined,
		data: undefined,
	};
};

export default clearToken;
