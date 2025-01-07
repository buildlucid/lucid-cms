import T from "../../translations/index.js";
import crypto from "node:crypto";
import Repository from "../../libs/repositories/index.js";
import type { ServiceFn } from "../../utils/services/types.js";

const createSingle: ServiceFn<
	[
		{
			userId: number;
			tokenType: "password_reset";
			expiryDate: string;
		},
	],
	{
		token: string;
	}
> = async (context, data) => {
	const UserTokens = Repository.get(
		"user-tokens",
		context.db,
		context.config.db,
	);

	const token = crypto.randomBytes(32).toString("hex");

	const userTokenRes = await UserTokens.createSingle({
		data: {
			user_id: data.userId,
			token_type: data.tokenType,
			expiry_date: data.expiryDate,
			token: token,
		},
		returning: ["token"],
		validation: {
			enabled: true,
		},
	});
	if (userTokenRes.error) return userTokenRes;

	return {
		error: undefined,
		data: {
			token: userTokenRes.data.token,
		},
	};
};

export default createSingle;
