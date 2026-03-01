import crypto from "node:crypto";
import type { UserTokenType } from "../../libs/db-adapter/types.js";
import { UserTokensRepository } from "../../libs/repositories/index.js";
import hashUserToken from "../../utils/helpers/hash-user-token.js";
import type { ServiceFn } from "../../utils/services/types.js";

const createSingle: ServiceFn<
	[
		{
			userId: number;
			tokenType: UserTokenType;
			expiryDate: string;
		},
	],
	{
		token: string;
	}
> = async (context, data) => {
	const UserTokens = new UserTokensRepository(
		context.db.client,
		context.config.db,
	);

	const token = crypto.randomBytes(32).toString("hex");
	const hashedToken = hashUserToken(token);

	const userTokenRes = await UserTokens.createSingle({
		data: {
			user_id: data.userId,
			token_type: data.tokenType,
			expiry_date: data.expiryDate,
			token: hashedToken,
		},
		validation: {
			enabled: true,
		},
	});
	if (userTokenRes.error) return userTokenRes;

	return {
		error: undefined,
		data: {
			token: token,
		},
	};
};

export default createSingle;
