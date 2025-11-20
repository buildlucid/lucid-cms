import { UserTokensRepository } from "../../../libs/repositories/index.js";
import type { ServiceFn } from "../../../utils/services/types.js";

/**
 * Deletes a single user token
 */
const deleteToken: ServiceFn<
	[
		{
			tokenId: number;
		},
	],
	undefined
> = async (context, data) => {
	const UserTokens = new UserTokensRepository(context.db, context.config.db);

	const deleteRes = await UserTokens.deleteSingle({
		where: [
			{
				key: "id",
				operator: "=",
				value: data.tokenId,
			},
		],
	});
	if (deleteRes.error) return deleteRes;

	return {
		error: undefined,
		data: undefined,
	};
};

export default deleteToken;
