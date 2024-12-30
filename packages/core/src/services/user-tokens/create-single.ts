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
	const UserTokensRepo = Repository.get(
		"user-tokens",
		context.db,
		context.config.db,
	);

	const token = crypto.randomBytes(32).toString("hex");

	const userToken = await UserTokensRepo.createSingle({
		userId: data.userId,
		tokenType: data.tokenType,
		expiryDate: data.expiryDate,
		token: token,
	});

	if (userToken === undefined) {
		return {
			error: {
				type: "basic",
				status: 500,
			},
			data: undefined,
		};
	}

	return {
		error: undefined,
		data: {
			token: userToken.token,
		},
	};
};

export default createSingle;
