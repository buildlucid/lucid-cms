import type { OIDCUserInfo, ServiceResponse } from "../../../types.js";
import { serverText } from "../../i18n/index.js";

/**
 * Maps a standard user info response to data we expect
 */
const mapStandardUserInfo = (
	rawUserInfo: Record<string, unknown>,
): Awaited<ServiceResponse<OIDCUserInfo>> => {
	const userId = (rawUserInfo?.sub || rawUserInfo?.id) as string;
	const firstName = (rawUserInfo?.given_name || rawUserInfo?.first_name) as
		| string
		| undefined;
	const lastName = (rawUserInfo?.family_name || rawUserInfo?.last_name) as
		| string
		| undefined;

	if (!userId) {
		return {
			error: {
				status: 400,
				name: serverText("core.auth.oidc.user.info.incomplete.name"),
				message: serverText("core.auth.oidc.user.info.incomplete.message"),
			},
			data: undefined,
		};
	}

	return {
		error: undefined,
		data: { userId, firstName, lastName },
	};
};

export default mapStandardUserInfo;
