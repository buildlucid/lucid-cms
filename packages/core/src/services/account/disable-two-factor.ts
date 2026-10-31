import { copy } from "../../libs/i18n/index.js";
import { UsersRepository } from "../../libs/repositories/index.js";
import type { TwoFactorProof } from "../../types/response.js";
import type { ServiceFn } from "../../utils/services/types.js";
import hasPasskeys from "../auth/passkeys/has-passkeys.js";
import checkProof from "../auth/two-factor/check-proof.js";
import isRequired from "../auth/two-factor/is-required.js";
import removeTwoFactor from "../auth/two-factor/remove.js";

/**
 * Disables the authenticator after proof. Required two-factor authentication must still be covered
 * by passkeys.
 */
const disableTwoFactor: ServiceFn<
	[
		{
			userId: number;
			superAdmin: boolean;
			proof: TwoFactorProof;
		},
	],
	undefined
> = async (context, data) => {
	//* removing a passkey at the same time can't leave a required user with neither
	const Users = new UsersRepository(context.db);
	const lockRes = await Users.lockForUpdate({ id: data.userId });
	if (lockRes.error) return lockRes;

	const [requiredRes, passkeysRes] = await Promise.all([
		isRequired(context, {
			userId: data.userId,
			superAdmin: data.superAdmin,
		}),
		hasPasskeys(context, { userId: data.userId }),
	]);
	if (requiredRes.error) return requiredRes;
	if (passkeysRes.error) return passkeysRes;
	if (requiredRes.data && !passkeysRes.data) {
		return {
			error: {
				type: "basic",
				status: 400,
				message: copy("server:core.auth.two.factor.required.message"),
			},
			data: undefined,
		};
	}

	const proofRes = await checkProof(context, {
		userId: data.userId,
		proof: data.proof,
	});
	if (proofRes.error) return proofRes;

	return removeTwoFactor(context, {
		userId: data.userId,
		performedBy: data.userId,
	});
};

export default disableTwoFactor;
