import T from "../../../translations/index.js";
import type { OIDCUserInfo, ServiceResponse } from "../../../types.js";

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
				name: T("oidc_user_info_incomplete_name"),
				message: T("oidc_user_info_incomplete_message"),
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
