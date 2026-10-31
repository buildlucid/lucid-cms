import { UserRecoveryCodesRepository } from "../../../libs/repositories/index.js";
import type { TwoFactorRecoveryCodes } from "../../../types/response.js";
import type { ServiceFn } from "../../../utils/services/types.js";
import {
	generateRecoveryCodes,
	hashRecoveryCode,
} from "./helpers/recovery-codes.js";

/** Swaps a user's recovery codes for a new set, returned so they can be shown once. */
const replaceRecoveryCodes: ServiceFn<
	[
		{
			userId: number;
		},
	],
	TwoFactorRecoveryCodes
> = async (context, data) => {
	const RecoveryCodes = new UserRecoveryCodesRepository(context.db);

	const deleteRes = await RecoveryCodes.deleteMultiple({
		where: [
			{
				key: "user_id",
				operator: "=",
				value: data.userId,
			},
		],
	});
	if (deleteRes.error) return deleteRes;

	const recoveryCodes = generateRecoveryCodes();
	const createRes = await RecoveryCodes.createMultiple({
		data: recoveryCodes.map((code) => ({
			user_id: data.userId,
			code: hashRecoveryCode(context, code),
		})),
	});
	if (createRes.error) return createRes;

	return {
		error: undefined,
		data: { recoveryCodes },
	};
};

export default replaceRecoveryCodes;
