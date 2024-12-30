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
	const UserTokensRepo = Repository.get(
		"user-tokens",
		context.db,
		context.config.db,
	);

	const userToken = await UserTokensRepo.selectSingle({
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
	});

	if (userToken === undefined) {
		return {
			error: {
				type: "basic",
				message: T("token_not_found_message"),
				status: 404,
			},
			data: undefined,
		};
	}

	return {
		error: undefined,
		data: userToken,
	};
};

export default getSingle;
