import constants from "../../constants/constants.js";
import { UserTokensRepository } from "../../libs/repositories/index.js";
import type { ServiceFn } from "../../utils/services/types.js";

/**
 * Marks expired tokens as revoked
 */
const clearExpiredTokens: ServiceFn<[], undefined> = async (context) => {
	const UserTokens = new UserTokensRepository(
		context.db.client,
		context.config.db,
	);
	const now = new Date().toISOString();

	const revokeExpiredRes = await UserTokens.updateMultiple({
		data: {
			revoked_at: now,
			revoke_reason: constants.userTokenRevokeReasons.expired,
		},
		where: [
			{
				key: "expiry_date",
				operator: "<",
				value: now,
			},
			{
				key: "revoked_at",
				operator: "is",
				value: null,
			},
		],
	});
	if (revokeExpiredRes.error) return revokeExpiredRes;

	return {
		error: undefined,
		data: undefined,
	};
};

export default clearExpiredTokens;
