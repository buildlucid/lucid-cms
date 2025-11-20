import { deleteCookie, getCookie } from "hono/cookie";
import { verify } from "hono/jwt";
import constants from "../../../constants/constants.js";
import cacheKeys from "../../../libs/kv-adapter/cache-keys.js";
import { UserTokensRepository } from "../../../libs/repositories/index.js";
import type { LucidHonoContext } from "../../../types/hono.js";
import type { ServiceResponse } from "../../../utils/services/types.js";

const clearToken = async (c: LucidHonoContext): ServiceResponse<undefined> => {
	const _refresh = getCookie(c, constants.cookies.refreshToken);
	if (!_refresh) {
		return {
			error: undefined,
			data: undefined,
		};
	}
	const config = c.get("config");

	const UserTokens = new UserTokensRepository(config.db.client, config.db);

	const decode = (await verify(_refresh, config.keys.refreshTokenSecret)) as {
		id: number;
	};

	deleteCookie(c, constants.cookies.refreshToken, { path: "/" });

	await c.get("kv").command.delete(cacheKeys.auth.refresh(_refresh));

	const deleteMultipleTokenRes = await UserTokens.deleteMultiple({
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
		],
	});
	if (deleteMultipleTokenRes.error) return deleteMultipleTokenRes;

	return {
		error: undefined,
		data: undefined,
	};
};

export default clearToken;
