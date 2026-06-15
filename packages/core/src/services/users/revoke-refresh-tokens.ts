import constants from "../../constants/constants.js";
import type { ServiceFn } from "../../utils/services/types.js";
import { authServices, userServices } from "../index.js";

const revokeRefreshTokens: ServiceFn<
	[
		{
			userId: number;
		},
	],
	undefined
> = async (context, data) => {
	const userRes = await userServices.checks.checkUserAccess(context, {
		id: data.userId,
	});
	if (userRes.error) return userRes;

	const revokeRes = await authServices.refreshToken.revokeUserTokens(context, {
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
