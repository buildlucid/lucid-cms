import constants from "../../../constants/constants.js";
import { sign } from "hono/jwt";
import services from "../../../services/index.js";
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

		const userRes = await services.users.getSingle(
			{
				db: config.db.client,
				config: config,
				queue: c.get("queue"),
				env: c.get("env"),
			},
			{
				userId: userId,
				activeUser: true,
			},
		);
		if (userRes.error) return userRes;

		const now = Date.now();
		const nonce = randomBytes(8).toString("hex");

		const token = await sign(
			{
				id: userRes.data.id,
				username: userRes.data.username,
				email: userRes.data.email,
				permissions: userRes.data.permissions,
				superAdmin: userRes.data.superAdmin ?? false,
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
