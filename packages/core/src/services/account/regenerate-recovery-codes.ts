import type { TwoFactorRecoveryCodes } from "../../types/response.js";
import type { TwoFactorProof } from "../../types/response.js";
import type { ServiceFn } from "../../utils/services/types.js";
import checkProof from "../auth/two-factor/check-proof.js";
import replaceRecoveryCodes from "../auth/two-factor/replace-recovery-codes.js";

/** Replaces the user's recovery codes, after a code from their app or one of the old recovery codes. */
const regenerateRecoveryCodes: ServiceFn<
	[
		{
			userId: number;
			proof: TwoFactorProof;
		},
	],
	TwoFactorRecoveryCodes
> = async (context, data) => {
	const proofRes = await checkProof(context, {
		userId: data.userId,
		proof: data.proof,
	});
	if (proofRes.error) return proofRes;

	return replaceRecoveryCodes(context, { userId: data.userId });
};

export default regenerateRecoveryCodes;
