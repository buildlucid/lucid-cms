import crypto from "node:crypto";
import constants from "../../../constants/constants.js";
import { copy } from "../../../libs/i18n/index.js";
import { UsersRepository } from "../../../libs/repositories/index.js";
import hashSecret from "../../../utils/helpers/hash-secret.js";
import { generateSecret } from "../../../utils/helpers/index.js";
import { normalizeEmailInput } from "../../../utils/helpers/normalize-input.js";
import type { ServiceFn } from "../../../utils/services/types.js";
import revokeUserTokens from "../../auth/refresh-token/revoke-user-tokens.js";
import logSecurityAudit from "../../security-audit/log-security-audit.js";

/**
 * Returns a temporary password for the CLI to display, requiring a change at next login.
 * CLI recovery bypasses admin permission checks.
 */
const resetPassword: ServiceFn<
	[
		{
			email: string;
		},
	],
	{
		password: string;
	}
> = async (context, data) => {
	if (context.config.auth.password.enabled === false) {
		return {
			error: {
				type: "basic",
				status: 400,
				message: copy(
					"server:core.auth.password.authentication.disabled.message",
				),
			},
			data: undefined,
		};
	}

	const Users = new UsersRepository(context.db);

	const userRes = await Users.selectSingle({
		select: ["id"],
		where: [
			{
				key: "email",
				operator: "=",
				value: normalizeEmailInput(data.email),
			},
		],
		validation: {
			enabled: true,
			defaultError: {
				status: 404,
				message: copy("server:core.user.not.found.message"),
			},
		},
	});
	if (userRes.error) return userRes;

	const password = crypto
		.randomBytes(constants.password.temporaryBytes)
		.toString("base64url");
	const { secret, encryptSecret } = generateSecret(
		context.config.secrets.encryption,
	);

	const [updateRes, auditRes] = await Promise.all([
		Users.updateSingle({
			data: {
				password: await hashSecret(password, secret),
				secret: encryptSecret,
				triggered_password_reset: true,
				updated_at: new Date().toISOString(),
			},
			where: [
				{
					key: "id",
					operator: "=",
					value: userRes.data.id,
				},
			],
			returning: ["id"],
			validation: {
				enabled: true,
			},
		}),
		logSecurityAudit(context, {
			userId: userRes.data.id,
			action: constants.securityAudit.actions.passwordChange,
			performedBy: null,
			previousValue: constants.securityAudit.redactedValue,
			newValue: constants.securityAudit.redactedValue,
		}),
	]);
	if (updateRes.error) return updateRes;
	if (auditRes.error) return auditRes;

	const sessionsRes = await revokeUserTokens(context, {
		userId: userRes.data.id,
		revokeReason: constants.refreshTokenRevokeReasons.passwordReset,
	});
	if (sessionsRes.error) return sessionsRes;

	return {
		error: undefined,
		data: {
			password: password,
		},
	};
};

export default resetPassword;
