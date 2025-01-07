import Repository from "../../libs/repositories/index.js";
import type { ServiceFn } from "../../utils/services/types.js";

/**
 * All expired tokens will be deleted from the database.
 */
const clearExpiredTokens: ServiceFn<[], undefined> = async (context) => {
	const UserTokens = Repository.get(
		"user-tokens",
		context.db,
		context.config.db,
	);

	const deleteMultipleTokenRes = await UserTokens.deleteMultiple({
		where: [
			{
				key: "expiry_date",
				operator: "<",
				value: new Date().toISOString(),
			},
		],
	});
	if (deleteMultipleTokenRes.error) return deleteMultipleTokenRes;

	return {
		error: undefined,
		data: undefined,
	};
};

export default clearExpiredTokens;
