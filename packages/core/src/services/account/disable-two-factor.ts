import { copy } from "../../libs/i18n/index.js";
import type { TwoFactorProof } from "../../types/response.js";
import type { ServiceFn } from "../../utils/services/types.js";
import checkProof from "../auth/two-factor/check-proof.js";
import isRequired from "../auth/two-factor/is-required.js";
import removeTwoFactor from "../auth/two-factor/remove.js";

/** Turns off two-factor authentication from the account page, after a code from the app or a recovery code. Not allowed when the user is required to use it. */
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
	const requiredRes = await isRequired(context, {
		userId: data.userId,
		superAdmin: data.superAdmin,
	});
	if (requiredRes.error) return requiredRes;
	if (requiredRes.data) {
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
