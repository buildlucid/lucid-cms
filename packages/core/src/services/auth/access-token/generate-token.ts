import constants from "../../../constants/constants.js";
import { sign } from "hono/jwt";
import { UsersRepository } from "../../../libs/repositories/index.js";
import formatter, {
	userPermissionsFormatter,
} from "../../../libs/formatters/index.js";
import { setCookie } from "hono/cookie";
import { randomBytes } from "node:crypto";
import type { ServiceResponse } from "../../../utils/services/types.js";
import type { LucidAuth, LucidHonoContext } from "../../../types/hono.js";

const generateToken = async (
	c: LucidHonoContext,
	userId: number,
): ServiceResponse<undefined> => {
	try {
		const config = c.get("config");

		const Users = new UsersRepository(config.db.client, config.db);
		const userRes = await Users.selectAccessTokenUser({
			where: [
				{ key: "id", operator: "=", value: userId },
				{
					key: "is_deleted",
					operator: "=",
					value: config.db.getDefault("boolean", "false"),
				},
				{
					key: "is_locked",
					operator: "=",
					value: config.db.getDefault("boolean", "false"),
				},
			],
			validation: { enabled: true },
		});
		if (userRes.error) return userRes;

		const now = Date.now();
		const nonce = randomBytes(8).toString("hex");

		const { permissions } = userPermissionsFormatter.formatMultiple({
			roles: userRes.data.roles || [],
		});

		const token = await sign(
			{
				id: userRes.data.id,
				username: userRes.data.username,
				email: userRes.data.email,
				permissions: permissions,
				superAdmin: formatter.formatBoolean(userRes.data.super_admin ?? false),
				exp: Math.floor(now / 1000) + constants.accessTokenExpiration,
				iat: Math.floor(now / 1000),
				nonce: nonce,
			} satisfies LucidAuth,
			config.keys.accessTokenSecret,
		);

		setCookie(c, constants.cookies.accessToken, token, {
			maxAge: constants.accessTokenExpiration,
			httpOnly: true,
			secure: c.req.url.startsWith("https://"),
			sameSite: "strict",
			path: "/",
		});

		return {
			error: undefined,
			data: undefined,
		};
	} catch (err) {
		return {
			error: {
				type: "authorisation",
			},
			data: undefined,
		};
	}
};

export default generateToken;
