import T from "../../../translations/index.js";
import constants from "../../../constants/constants.js";
import { verify } from "hono/jwt";
import { getCookie } from "hono/cookie";
import type { ServiceResponse } from "../../../utils/services/types.js";
import type { LucidAuth, LucidHonoContext } from "../../../types/hono.js";

const verifyToken = async (c: LucidHonoContext): ServiceResponse<LucidAuth> => {
	try {
		const config = c.get("config");
		const _access = getCookie(c, constants.cookies.accessToken);

		if (!_access) {
			return {
				error: {
					type: "authorisation",
					code: "authorisation",
					message: T("not_authorized_to_perform_action"),
				},
				data: undefined,
			};
		}

		const decode = (await verify(
			_access,
			config.keys.accessTokenSecret,
		)) as LucidAuth;

		return {
			error: undefined,
			data: decode,
		};
	} catch (err) {
		return {
			error: {
				type: "authorisation",
				code: "authorisation",
				message: T("not_authorized_to_perform_action"),
			},
			data: undefined,
		};
	}
};

export default verifyToken;
