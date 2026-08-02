import constants from "../../constants/constants.js";
import type { ServiceFn } from "../../utils/services/types.js";
import revokeUserTokens from "../auth/refresh-token/revoke-user-tokens.js";
import checkUserAccess from "./checks/check-user-access.js";

const revokeRefreshTokens: ServiceFn<
	[
		{
			userId: number;
		},
	],
	undefined
> = async (context, data) => {
	const userRes = await checkUserAccess(context, {
		id: data.userId,
	});
	if (userRes.error) return userRes;

	const revokeRes = await revokeUserTokens(context, {
		userId: data.userId,
		revokeReason: constants.refreshTokenRevokeReasons.adminRevokeAll,
	});
	if (revokeRes.error) return revokeRes;

	return {
		error: undefined,
		data: undefined,
	};
};

export default revokeRefreshTokens;
