import constants from "../../../constants/constants.js";
import { copy } from "../../../libs/i18n/index.js";
import { UsersRepository } from "../../../libs/repositories/index.js";
import type { TwoFactorRecoveryCodes } from "../../../types/response.js";
import { decrypt } from "../../../utils/helpers/encrypt-decrypt.js";
import type { ServiceFn } from "../../../utils/services/types.js";
import logSecurityAudit from "../../security-audit/log-security-audit.js";
import { matchTotpCode } from "./helpers/totp.js";
import replaceRecoveryCodes from "./replace-recovery-codes.js";

/** Confirms the pending secret and replaces recovery codes, returning the new codes once. */
const activateSecret: ServiceFn<
	[
		{
			userId: number;
			code: string;
		},
	],
	TwoFactorRecoveryCodes
> = async (context, data) => {
	const Users = new UsersRepository(context.db);

	const userRes = await Users.selectSingle({
		select: ["two_factor_pending_secret", "two_factor_enabled_at"],
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

	const pendingSecret = userRes.data.two_factor_pending_secret;
	if (!pendingSecret) {
		return {
			error: {
				type: "basic",
				status: 400,
				message: copy("server:core.auth.two.factor.setup.not.started.message"),
			},
			data: undefined,
		};
	}

	const step = matchTotpCode({
		secret: Buffer.from(
			decrypt(pendingSecret, context.config.secrets.encryption),
			"hex",
		),
		code: data.code,
		lastStep: null,
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

	const now = new Date().toISOString();

	const updateRes = await Users.updateSingle({
		data: {
			two_factor_secret: pendingSecret,
			two_factor_pending_secret: null,
			//* replacing an app keeps the date two-factor authentication was first turned on
			two_factor_enabled_at: userRes.data.two_factor_enabled_at
				? undefined
				: now,
			two_factor_last_step: step,
			updated_at: now,
		},
		where: [
			{
				key: "id",
				operator: "=",
				value: data.userId,
			},
			//* of two confirms at once, only the first still finds the secret pending
			{
				key: "two_factor_pending_secret",
				operator: "=",
				value: pendingSecret,
			},
		],
		returning: ["id"],
	});
	if (updateRes.error) return updateRes;
	if (!updateRes.data) {
		return {
			error: {
				type: "basic",
				status: 400,
				message: copy("server:core.auth.two.factor.setup.not.started.message"),
			},
			data: undefined,
		};
	}

	const [codesRes, auditRes] = await Promise.all([
		replaceRecoveryCodes(context, { userId: data.userId }),
		logSecurityAudit(context, {
			userId: data.userId,
			action: constants.securityAudit.actions.twoFactorChange,
			performedBy: data.userId,
			previousValue: userRes.data.two_factor_enabled_at
				? "enabled"
				: "disabled",
			newValue: "enabled",
		}),
	]);
	if (codesRes.error) return codesRes;
	if (auditRes.error) return auditRes;

	return {
		error: undefined,
		data: codesRes.data,
	};
};

export default activateSecret;
