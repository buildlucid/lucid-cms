import T from "../../translations/index.js";
import Repository from "../../libs/repositories/index.js";
import type { ServiceFn } from "../../utils/services/types.js";

const getSingle: ServiceFn<
	[
		{
			tokenType: "password_reset";
			token: string;
		},
	],
	{
		id: number;
		user_id: number | null;
	}
> = async (context, data) => {
	const UserTokens = Repository.get(
		"user-tokens",
		context.db,
		context.config.db,
	);

	const userTokenRes = await UserTokens.selectSingle({
		select: ["id", "user_id"],
		where: [
			{
				key: "token",
				operator: "=",
				value: data.token,
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
