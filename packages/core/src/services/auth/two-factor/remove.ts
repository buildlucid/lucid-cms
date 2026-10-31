import constants from "../../../constants/constants.js";
import {
	UserRecoveryCodesRepository,
	UsersRepository,
	UserTokensRepository,
} from "../../../libs/repositories/index.js";
import type { ServiceFn } from "../../../utils/services/types.js";
import logSecurityAudit from "../../security-audit/log-security-audit.js";

/** Removes the authenticator, recovery codes and pending challenges, and logs the change. */
const remove: ServiceFn<
	[
		{
			userId: number;
			/** Empty when it's turned off from the CLI. */
			performedBy: number | null;
		},
	],
	undefined
> = async (context, data) => {
	const Users = new UsersRepository(context.db);
	const RecoveryCodes = new UserRecoveryCodesRepository(context.db);
	const UserTokens = new UserTokensRepository(context.db);
	const now = new Date().toISOString();

	const [updateRes, deleteCodesRes, revokeRes, auditRes] = await Promise.all([
		Users.updateSingle({
			data: {
				two_factor_secret: null,
				two_factor_pending_secret: null,
				two_factor_enabled_at: null,
				two_factor_last_step: null,
				two_factor_failed_attempts: 0,
				two_factor_attempts_reset_at: null,
				updated_at: now,
			},
			where: [
				{
					key: "id",
					operator: "=",
					value: data.userId,
				},
			],
			returning: ["id"],
			validation: {
				enabled: true,
			},
		}),
		RecoveryCodes.deleteMultiple({
			where: [
				{
					key: "user_id",
					operator: "=",
					value: data.userId,
				},
			],
		}),
		UserTokens.updateMultiple({
			data: {
				revoked_at: now,
				revoke_reason: constants.userTokenRevokeReasons.twoFactorRemoved,
			},
			where: [
				{
					key: "user_id",
					operator: "=",
					value: data.userId,
				},
				{
					key: "token_type",
					operator: "=",
					value: constants.userTokens.twoFactorChallenge,
				},
				{
					key: "revoked_at",
					operator: "is",
					value: null,
				},
			],
		}),
		logSecurityAudit(context, {
			userId: data.userId,
			action: constants.securityAudit.actions.twoFactorChange,
			performedBy: data.performedBy,
			previousValue: "enabled",
			newValue: "disabled",
		}),
	]);
	if (updateRes.error) return updateRes;
	if (deleteCodesRes.error) return deleteCodesRes;
	if (revokeRes.error) return revokeRes;
	if (auditRes.error) return auditRes;

	return {
		error: undefined,
		data: undefined,
	};
};

export default remove;
