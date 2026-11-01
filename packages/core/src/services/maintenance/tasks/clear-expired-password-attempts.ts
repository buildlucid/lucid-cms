import { PasswordAttemptsRepository } from "../../../libs/repositories/index.js";
import type { ServiceFn } from "../../../utils/services/types.js";

const clearExpiredPasswordAttempts: ServiceFn<[], undefined> = async (
	context,
) => {
	const PasswordAttempts = new PasswordAttemptsRepository(context.db);

	const clearRes = await PasswordAttempts.deleteMultiple({
		where: [
			{
				key: "reset_at",
				operator: "<",
				value: new Date().toISOString(),
			},
		],
	});
	if (clearRes.error) return clearRes;

	return {
		error: undefined,
		data: undefined,
	};
};

export default clearExpiredPasswordAttempts;
