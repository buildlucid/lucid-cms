import { copy } from "../../../libs/i18n/index.js";
import {
	UserRecoveryCodesRepository,
	UsersRepository,
} from "../../../libs/repositories/index.js";
import type { TwoFactorProof } from "../../../types/response.js";
import { decrypt } from "../../../utils/helpers/encrypt-decrypt.js";
import type { ServiceFn } from "../../../utils/services/types.js";
import { hashRecoveryCode } from "./helpers/recovery-codes.js";
import { matchTotpCode } from "./helpers/totp.js";

/** Checks and consumes a TOTP step or recovery code to prevent reuse. */
const checkProof: ServiceFn<
	[
		{
			userId: number;
			proof: TwoFactorProof;
		},
	],
	undefined
> = async (context, data) => {
	const Users = new UsersRepository(context.db);

	const userRes = await Users.selectSingle({
		select: [
			"two_factor_secret",
			"two_factor_enabled_at",
			"two_factor_last_step",
		],
		where: [
			{
				key: "id",
				operator: "=",
				value: data.userId,
			},
		],
		validation: {
			enabled: true,
		},
	});
	if (userRes.error) return userRes;

	if (!userRes.data.two_factor_enabled_at || !userRes.data.two_factor_secret) {
		return {
			error: {
				type: "basic",
				status: 400,
				message: copy("server:core.auth.two.factor.not.enabled.message"),
			},
			data: undefined,
		};
	}

	if ("recoveryCode" in data.proof) {
		const RecoveryCodes = new UserRecoveryCodesRepository(context.db);
		const useRes = await RecoveryCodes.useCode({
			userId: data.userId,
			code: hashRecoveryCode(context, data.proof.recoveryCode),
		});
		if (useRes.error) return useRes;
		if (!useRes.data) {
			return {
				error: {
					type: "authorisation",
					status: 401,
					message: copy(
						"server:core.auth.two.factor.invalid.recovery.code.message",
					),
				},
				data: undefined,
			};
		}

		return {
			error: undefined,
			data: undefined,
		};
	}

	const step = matchTotpCode({
		secret: Buffer.from(
			decrypt(
				userRes.data.two_factor_secret,
				context.config.secrets.encryption,
			),
			"hex",
		),
		code: data.proof.code,
		lastStep: userRes.data.two_factor_last_step,
	});

	if (step === null) {
		return {
			error: {
				type: "authorisation",
				status: 401,
				message: copy("server:core.auth.two.factor.invalid.code.message"),
			},
			data: undefined,
		};
	}

	//* recording the step only works once per step, so the same code can't be used twice in parallel
	const stepRes = await Users.updateTwoFactorLastStep({
		id: data.userId,
		step,
	});
	if (stepRes.error) return stepRes;
	if (!stepRes.data) {
		return {
			error: {
				type: "authorisation",
				status: 401,
				message: copy("server:core.auth.two.factor.invalid.code.message"),
			},
			data: undefined,
		};
	}

	return {
		error: undefined,
		data: undefined,
	};
};

export default checkProof;
