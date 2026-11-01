import constants from "../../../constants/constants.js";
import formatter from "../../../libs/formatters/index.js";
import {
	UserAuthProvidersRepository,
	UserPasskeysRepository,
} from "../../../libs/repositories/index.js";
import type { ServiceFn } from "../../../utils/services/types.js";
import logSecurityAudit from "../../security-audit/log-security-audit.js";

/**
 * Removes and audits sign-in methods added since the email change, preventing continued access
 * after reversal.
 */
const removeSignInsSince: ServiceFn<
	[
		{
			userId: number;
			since: Date | string;
		},
	],
	undefined
> = async (context, data) => {
	const Passkeys = new UserPasskeysRepository(context.db);
	const AuthProviders = new UserAuthProvidersRepository(context.db);

	//* compared here, as SQLite stores some times in a different text format to others
	const since = Date.parse(formatter.formatDate(data.since));
	const addedSince = (date: Date | string | null) =>
		Date.parse(formatter.formatDate(date) ?? "") >= since;

	const [passkeysRes, providersRes] = await Promise.all([
		Passkeys.selectMultiple({
			select: ["id", "name", "created_at"],
			where: [{ key: "user_id", operator: "=", value: data.userId }],
			validation: {
				enabled: true,
			},
		}),
		AuthProviders.selectMultiple({
			select: ["id", "provider_key", "linked_at"],
			where: [{ key: "user_id", operator: "=", value: data.userId }],
			validation: {
				enabled: true,
			},
		}),
	]);
	if (passkeysRes.error) return passkeysRes;
	if (providersRes.error) return providersRes;

	const passkeys = passkeysRes.data.filter((passkey) =>
		addedSince(passkey.created_at),
	);
	const providers = providersRes.data.filter((provider) =>
		addedSince(provider.linked_at),
	);

	const [deletePasskeysRes, deleteProvidersRes] = await Promise.all([
		passkeys.length > 0
			? Passkeys.deleteMultiple({
					where: [
						{
							key: "id",
							operator: "in",
							value: passkeys.map((passkey) => passkey.id),
						},
					],
				})
			: undefined,
		providers.length > 0
			? AuthProviders.deleteMultiple({
					where: [
						{
							key: "id",
							operator: "in",
							value: providers.map((provider) => provider.id),
						},
					],
				})
			: undefined,
	]);
	if (deletePasskeysRes?.error) return deletePasskeysRes;
	if (deleteProvidersRes?.error) return deleteProvidersRes;

	const auditResults = await Promise.all([
		passkeys.length > 0
			? logSecurityAudit(context, {
					userId: data.userId,
					action: constants.securityAudit.actions.passkeyChange,
					performedBy: data.userId,
					previousValue: passkeys.map((passkey) => passkey.name).join(", "),
					newValue: "",
				})
			: undefined,
		...providers.map((provider) =>
			logSecurityAudit(context, {
				userId: data.userId,
				action: constants.securityAudit.actions.authProviderUnlink,
				performedBy: data.userId,
				previousValue: provider.provider_key,
				newValue: "unlinked",
			}),
		),
	]);
	for (const auditRes of auditResults) {
		if (auditRes?.error) return auditRes;
	}

	return {
		error: undefined,
		data: undefined,
	};
};

export default removeSignInsSince;
