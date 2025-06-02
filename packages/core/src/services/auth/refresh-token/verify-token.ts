import T from "../../../translations/index.js";
import { verify } from "hono/jwt";
import constants from "../../../constants/constants.js";
import Repository from "../../../libs/repositories/index.js";
import services from "../../index.js";
import { getCookie } from "hono/cookie";
import type { ServiceResponse } from "../../../utils/services/types.js";
import type { LucidHonoContext } from "../../../types/hono.js";

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

		const UserTokens = Repository.get(
			"user-tokens",
			config.db.client,
			config.db,
		);

		const decode = (await verify(_refresh, config.keys.refreshTokenSecret)) as {
			id: number;
		};

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
					value: "refresh",
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

		return {
			error: undefined,
			data: {
				user_id: tokenRes.data.user_id as number,
			},
		};
	} catch (err) {
		const [refreshRes, accessRes] = await Promise.all([
			services.auth.refreshToken.clearToken(c),
			services.auth.accessToken.clearToken(c),
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
