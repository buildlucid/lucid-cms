import { UserLoginsRepository } from "../../libs/repositories/index.js";
import type { ServiceFn } from "../../utils/services/types.js";

const createSingle: ServiceFn<
	[
		{
			userId: number;
			tokenId: number;
			authMethod: string;
			ipAddress: string | null;
			userAgent: string | null;
		},
	],
	number
> = async (context, data) => {
	const UserLogins = new UserLoginsRepository(context.db, context.config.db);

	const newLoginRes = await UserLogins.createSingle({
		data: {
			user_id: data.userId,
			token_id: data.tokenId,
			auth_method: data.authMethod,
			ip_address: data.ipAddress,
			user_agent: data.userAgent,
		},
		returning: ["id"],
		validation: {
			enabled: true,
		},
	});
	if (newLoginRes.error) return newLoginRes;

	return {
		error: undefined,
		data: newLoginRes.data.id,
	};
};

export default createSingle;
