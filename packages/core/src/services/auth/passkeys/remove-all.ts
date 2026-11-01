import constants from "../../../constants/constants.js";
import { copy } from "../../../libs/i18n/index.js";
import { UserPasskeysRepository } from "../../../libs/repositories/index.js";
import type { ServiceFn } from "../../../utils/services/types.js";
import logSecurityAudit from "../../security-audit/log-security-audit.js";
import revokeUserTokens from "../refresh-token/revoke-user-tokens.js";

/**
 * Removes all of a user's passkeys and logs the change. Errors when they have none. A reset by
 * someone else, such as an admin or the CLI, also logs the user out everywhere.
 */
const removeAll: ServiceFn<
	[
		{
			userId: number;
			/** Empty when they're removed from the CLI. */
			performedBy: number | null;
		},
	],
	undefined
> = async (context, data) => {
	const Passkeys = new UserPasskeysRepository(context.db);

	const deleteRes = await Passkeys.deleteMultiple({
		where: [
			{
				key: "user_id",
				operator: "=",
				value: data.userId,
			},
		],
		returning: ["name"],
		validation: {
			enabled: true,
		},
	});
	if (deleteRes.error) return deleteRes;

	if (deleteRes.data.length === 0) {
		return {
			error: {
				type: "basic",
				status: 400,
				message: copy("server:core.auth.passkeys.none.message"),
			},
			data: undefined,
		};
	}

	const auditRes = await logSecurityAudit(context, {
		userId: data.userId,
		action: constants.securityAudit.actions.passkeyChange,
		performedBy: data.performedBy,
		previousValue: deleteRes.data.map((passkey) => passkey.name).join(", "),
		newValue: "",
	});
	if (auditRes.error) return auditRes;

	if (data.performedBy !== data.userId) {
		const sessionsRes = await revokeUserTokens(context, {
			userId: data.userId,
			revokeReason: constants.refreshTokenRevokeReasons.passkeysReset,
		});
		if (sessionsRes.error) return sessionsRes;
	}

	return {
		error: undefined,
		data: undefined,
	};
};

export default removeAll;
