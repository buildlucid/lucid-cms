import crypto from "node:crypto";
import type { UserTokenType } from "../../libs/db/tables/index.js";
import { UserTokensRepository } from "../../libs/repositories/index.js";
import hashUserToken from "../../utils/helpers/hash-user-token.js";
import type { ServiceFn } from "../../utils/services/types.js";

const createSingle: ServiceFn<
	[
		{
			userId: number;
			tokenType: UserTokenType;
			expiryDate: string;
			/** Hashed short code that can be entered instead of the token. */
			code?: string;
			/** The address the token is emailed to, for tokens that stop working when the account's email changes. */
			email?: string;
		},
	],
	{
		token: string;
		tokenId: number;
	}
> = async (context, data) => {
	const UserTokens = new UserTokensRepository(context.db);

	const token = crypto.randomBytes(32).toString("hex");
	const hashedToken = hashUserToken(token);

	const userTokenRes = await UserTokens.createSingle({
		data: {
			user_id: data.userId,
			token_type: data.tokenType,
			expiry_date: data.expiryDate,
			token: hashedToken,
			code: data.code,
			email: data.email,
		},
		returning: ["id"],
		validation: {
			enabled: true,
		},
	});
	if (userTokenRes.error) return userTokenRes;

	return {
		error: undefined,
		data: {
			token: token,
			tokenId: userTokenRes.data.id,
		},
	};
};

export default createSingle;
