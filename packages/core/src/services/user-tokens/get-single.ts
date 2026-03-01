import type { UserTokenType } from "../../libs/db-adapter/types.js";
import { UserTokensRepository } from "../../libs/repositories/index.js";
import T from "../../translations/index.js";
import hashUserToken from "../../utils/helpers/hash-user-token.js";
import type { ServiceFn } from "../../utils/services/types.js";

const getSingle: ServiceFn<
	[
		{
			tokenType: UserTokenType;
			token: string;
		},
	],
	{
		id: number;
		user_id: number | null;
	}
> = async (context, data) => {
	const UserTokens = new UserTokensRepository(
		context.db.client,
		context.config.db,
	);
	const hashedToken = hashUserToken(data.token);

	const userTokenRes = await UserTokens.selectSingle({
		select: ["id", "user_id"],
		where: [
			{
				key: "token",
				operator: "=",
				value: hashedToken,
			},
			{
				key: "token_type",
				operator: "=",
				value: data.tokenType,
			},
			{
				key: "expiry_date",
				operator: ">",
				value: new Date().toISOString(),
			},
			{
				key: "revoked_at",
				operator: "is",
				value: null,
			},
			{
				key: "consumed_at",
				operator: "is",
				value: null,
			},
		],
		validation: {
			enabled: true,
			defaultError: {
				message: T("token_not_found_message"),
				status: 404,
			},
		},
	});
	if (userTokenRes.error) return userTokenRes;

	return {
		error: undefined,
		data: userTokenRes.data,
	};
};

export default getSingle;
