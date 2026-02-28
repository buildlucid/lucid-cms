import constants from "../../constants/constants.js";
import type { ServiceFn } from "../../utils/services/types.js";
import { authServices } from "../index.js";

const revokeAllRefreshTokens: ServiceFn<
	[
		{
			userId: number;
		},
	],
	undefined
> = async (context, data) => {
	const revokeRes = await authServices.refreshToken.revokeUserTokens(context, {
		userId: data.userId,
		revokeReason: constants.refreshTokenRevokeReasons.accountRevokeAll,
	});
	if (revokeRes.error) return revokeRes;

	return {
		error: undefined,
		data: undefined,
	};
};

export default revokeAllRefreshTokens;
