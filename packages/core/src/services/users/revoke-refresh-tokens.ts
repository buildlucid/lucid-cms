import constants from "../../constants/constants.js";
import { copy } from "../../libs/i18n/index.js";
import { UsersRepository } from "../../libs/repositories/index.js";
import type { ServiceFn } from "../../utils/services/types.js";
import { authServices } from "../index.js";

const revokeRefreshTokens: ServiceFn<
	[
		{
			userId: number;
		},
	],
	undefined
> = async (context, data) => {
	const Users = new UsersRepository(context.db.client, context.config.db);

	const userRes = await Users.selectSingle({
		select: ["id"],
		where: [
			{
				key: "id",
				operator: "=",
				value: data.userId,
			},
		],
		validation: {
			enabled: true,
			defaultError: {
				message: copy("server:core.user.not.found.message"),
				status: 404,
			},
		},
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
