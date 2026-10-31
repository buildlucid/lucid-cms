import constants from "../../constants/constants.js";
import formatter from "../../libs/formatters/index.js";
import { copy } from "../../libs/i18n/index.js";
import {
	UserAuthProvidersRepository,
	UserPasskeysRepository,
	UsersRepository,
} from "../../libs/repositories/index.js";
import type { ServiceFn } from "../../utils/services/types.js";
import isRequired from "../auth/two-factor/is-required.js";
import logSecurityAudit from "../security-audit/log-security-audit.js";

/** Keeps the last passkey when needed for login or required two-factor authentication. */
const deletePasskey: ServiceFn<
	[
		{
			userId: number;
			superAdmin: boolean;
			passkeyId: number;
		},
	],
	undefined
> = async (context, data) => {
	const Users = new UsersRepository(context.db);
	const Passkeys = new UserPasskeysRepository(context.db);
	const AuthProviders = new UserAuthProvidersRepository(context.db);

	//* with no password or magic link login, a passkey or enabled provider's link is the only way in
	const emailOrPasswordLogin =
		context.config.auth.password.enabled ||
		context.config.auth.magicLink.enabled;
	const enabledProviderKeys = context.config.auth.providers
		.filter((provider) => provider.enabled)
		.map((provider) => provider.key);

	//* two removals at once can't both pass the checks below and leave nothing
	const lockRes = await Users.lockForUpdate({ id: data.userId });
	if (lockRes.error) return lockRes;

	const [requiredRes, userRes, countRes, providersRes] = await Promise.all([
		isRequired(context, {
			userId: data.userId,
			superAdmin: data.superAdmin,
		}),
		Users.selectSingle({
			select: ["two_factor_enabled_at"],
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
		}),
		Passkeys.count({
			where: [
				{
					key: "user_id",
					operator: "=",
					value: data.userId,
				},
			],
		}),
		emailOrPasswordLogin || enabledProviderKeys.length === 0
			? undefined
			: AuthProviders.count({
					where: [
						{
							key: "user_id",
							operator: "=",
							value: data.userId,
						},
						{
							key: "provider_key",
							operator: "in",
							value: enabledProviderKeys,
						},
					],
				}),
	]);
	if (requiredRes.error) return requiredRes;
	if (userRes.error) return userRes;
	if (countRes.error) return countRes;
	if (providersRes?.error) return providersRes;

	const isLastPasskey = formatter.parseCount(countRes.data?.count) <= 1;

	if (
		isLastPasskey &&
		!emailOrPasswordLogin &&
		formatter.parseCount(providersRes?.data?.count) === 0
	) {
		return {
			error: {
				type: "basic",
				status: 400,
				message: copy("server:core.auth.passkeys.last.login.message"),
			},
			data: undefined,
		};
	}

	if (
		isLastPasskey &&
		requiredRes.data &&
		!userRes.data.two_factor_enabled_at
	) {
		return {
			error: {
				type: "basic",
				status: 400,
				message: copy("server:core.auth.passkeys.last.required.message"),
			},
			data: undefined,
		};
	}

	const deleteRes = await Passkeys.deleteSingle({
		where: [
			{
				key: "id",
				operator: "=",
				value: data.passkeyId,
			},
			{
				key: "user_id",
				operator: "=",
				value: data.userId,
			},
		],
		returning: ["name"],
		validation: {
			enabled: true,
			defaultError: {
				status: 404,
				message: copy("server:core.auth.passkeys.not.found.message"),
			},
		},
	});
	if (deleteRes.error) return deleteRes;

	const auditRes = await logSecurityAudit(context, {
		userId: data.userId,
		action: constants.securityAudit.actions.passkeyChange,
		performedBy: data.userId,
		previousValue: deleteRes.data.name,
		newValue: "",
	});
	if (auditRes.error) return auditRes;

	return {
		error: undefined,
		data: undefined,
	};
};

export default deletePasskey;
