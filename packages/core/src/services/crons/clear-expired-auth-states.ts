import { AuthStatesRepository } from "../../libs/repositories/index.js";
import type { ServiceFn } from "../../utils/services/types.js";

/**
 * Deletes expired auth state rows.
 */
const clearExpiredAuthStates: ServiceFn<[], undefined> = async (context) => {
	const AuthStates = new AuthStatesRepository(
		context.db.client,
		context.config.db,
	);
	const now = new Date().toISOString();

	const clearRes = await AuthStates.deleteMultiple({
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

export default clearExpiredAuthStates;
