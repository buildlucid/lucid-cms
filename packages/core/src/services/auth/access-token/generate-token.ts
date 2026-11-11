import { randomBytes } from "node:crypto";
import { setCookie } from "hono/cookie";
import { sign } from "hono/jwt";
import constants from "../../../constants/constants.js";
import createServiceContext from "../../../libs/http/utils/create-service-context.js";
import { UsersRepository } from "../../../libs/repositories/index.js";
import type {
	LucidAccessToken,
	LucidHonoContext,
} from "../../../types/hono.js";
import { isRequestSecure } from "../../../utils/helpers/index.js";
import type { ServiceResponse } from "../../../utils/services/types.js";

/**
 * Sets the access cookie. Omit `authTime` for login or reauthentication; preserve it during
 * refresh. The token carries the user's session version, so ending every session stops it.
 */
const generateToken = async (
	c: LucidHonoContext,
	userId: number,
	authTime?: number,
): ServiceResponse<undefined> => {
	try {
		const config = c.get("config");
		const Users = new UsersRepository(createServiceContext(c).db);

		const userRes = await Users.selectSingle({
			select: ["session_version"],
			where: [{ key: "id", operator: "=", value: userId }],
			validation: { enabled: true },
		});
		if (userRes.error) return userRes;

		const now = Date.now();
		const nonce = randomBytes(8).toString("hex");

		const token = await sign(
			{
				id: userId,
				exp: Math.floor(now / 1000) + constants.accessTokenExpiration,
				iat: Math.floor(now / 1000),
				nonce: nonce,
				authTime: authTime ?? Math.floor(now / 1000),
				sessionVersion: userRes.data.session_version,
			} satisfies LucidAccessToken,
			config.secrets.accessToken,
			constants.jwt.algorithm,
		);

		setCookie(c, constants.cookies.accessToken, token, {
			maxAge: constants.accessTokenExpiration,
			httpOnly: true,
			secure: isRequestSecure(c),
			sameSite: "strict",
			path: "/",
		});

		return {
			error: undefined,
			data: undefined,
		};
	} catch (_err) {
		return {
			error: {
				type: "authorisation",
			},
			data: undefined,
		};
	}
};

export default generateToken;
