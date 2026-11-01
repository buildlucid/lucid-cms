import constants from "../../../constants/constants.js";
import { copy } from "../../../libs/i18n/index.js";
import type { LucidAuth } from "../../../types/hono.js";
import type { ServiceResponse } from "../../../utils/services/types.js";

/**
 * Requires a recent login or reauthentication before security changes. Returns
 * `reauthentication_required` to trigger the admin prompt.
 */
const checkRecentAuthentication = (
	auth: Pick<LucidAuth, "authTime">,
): Awaited<ServiceResponse<undefined>> => {
	const age = Math.floor(Date.now() / 1000) - auth.authTime;
	if (age <= constants.reauthentication.windowSeconds) {
		return {
			error: undefined,
			data: undefined,
		};
	}

	return {
		error: {
			type: "forbidden",
			code: "reauthentication_required",
			status: 403,
			message: copy("server:core.auth.reauthentication.required.message"),
		},
		data: undefined,
	};
};

export default checkRecentAuthentication;
