import { UserTokensRepository } from "../../libs/repositories/index.js";
import type { ServiceFn } from "../../utils/services/types.js";

/**
 * Finds all expired tokens and queues them for deletion
 */
const clearExpiredTokens: ServiceFn<[], undefined> = async (context) => {
	const UserTokens = new UserTokensRepository(context.db, context.config.db);

	const expiredTokensRes = await UserTokens.selectMultiple({
		select: ["id"],
		where: [
			{
				key: "expiry_date",
				operator: "<",
				value: new Date().toISOString(),
			},
		],
		validation: {
			enabled: true,
		},
	});
	if (expiredTokensRes.error) return expiredTokensRes;

	if (expiredTokensRes.data.length === 0) {
		return {
			error: undefined,
			data: undefined,
		};
	}

	const queueRes = await context.queue.command.addBatch("user-tokens:delete", {
		payloads: expiredTokensRes.data.map((token) => ({
			tokenId: token.id,
		})),
		serviceContext: context,
	});
	if (queueRes.error) return queueRes;

	return {
		error: undefined,
		data: undefined,
	};
};

export default clearExpiredTokens;
