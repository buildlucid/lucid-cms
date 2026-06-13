import { getCookie } from "hono/cookie";
import { verify } from "hono/jwt";
import constants from "../../../constants/constants.js";
import { copy } from "../../../libs/i18n/index.js";
import type {
	LucidAccessToken,
	LucidHonoContext,
} from "../../../types/hono.js";
import type { ServiceResponse } from "../../../utils/services/types.js";

const verifyToken = async (
	c: LucidHonoContext,
): ServiceResponse<LucidAccessToken> => {
	try {
		const config = c.get("config");
		const _access = getCookie(c, constants.cookies.accessToken);

		if (!_access) {
			return {
				error: {
					type: "authorisation",
					code: "authorisation",
					message: copy("server:core.permissions.unauthorized"),
				},
				data: undefined,
			};
		}

		const decode = (await verify(
			_access,
			config.secrets.accessToken,
			constants.jwt.algorithm,
		)) as LucidAccessToken;

		return {
			error: undefined,
			data: decode,
		};
	} catch (_err) {
		return {
			error: {
				type: "authorisation",
				code: "authorisation",
				message: copy("server:core.permissions.unauthorized"),
			},
			data: undefined,
		};
	}
};

export default verifyToken;
