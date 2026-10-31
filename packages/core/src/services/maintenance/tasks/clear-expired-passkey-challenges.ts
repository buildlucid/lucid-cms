import { PasskeyChallengesRepository } from "../../../libs/repositories/index.js";
import type { ServiceFn } from "../../../utils/services/types.js";

const clearExpiredPasskeyChallenges: ServiceFn<[], undefined> = async (
	context,
) => {
	const PasskeyChallenges = new PasskeyChallengesRepository(context.db);
	const now = new Date().toISOString();

	const clearRes = await PasskeyChallenges.deleteMultiple({
		where: [
			{
				key: "expiry_date",
				operator: "<",
				value: now,
			},
		],
	});
	if (clearRes.error) return clearRes;

	return {
		error: undefined,
		data: undefined,
	};
};

export default clearExpiredPasskeyChallenges;
