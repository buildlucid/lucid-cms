import type { UserTokenType } from "../../libs/db/tables/index.js";
import { copy } from "../../libs/i18n/index.js";
import { UserTokensRepository } from "../../libs/repositories/index.js";
import hashUserToken from "../../utils/helpers/hash-user-token.js";
import type { ServiceFn } from "../../utils/services/types.js";

/** Finds an active token, requiring its email to still match the account. */
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
	const UserTokens = new UserTokensRepository(context.db);
	const hashedToken = hashUserToken(data.token);

	const userTokenRes = await UserTokens.selectActive({
		token: hashedToken,
		tokenType: data.tokenType,
		validation: {
			enabled: true,
			defaultError: {
				message: copy("server:core.tokens.not.found.message"),
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
