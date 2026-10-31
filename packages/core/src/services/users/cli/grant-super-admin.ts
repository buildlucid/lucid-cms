import constants from "../../../constants/constants.js";
import formatter from "../../../libs/formatters/index.js";
import { copy } from "../../../libs/i18n/index.js";
import { UsersRepository } from "../../../libs/repositories/index.js";
import { normalizeEmailInput } from "../../../utils/helpers/normalize-input.js";
import type { ServiceFn } from "../../../utils/services/types.js";
import { invalidateAuthCache } from "../../auth/helpers/auth-cache.js";
import logSecurityAudit from "../../security-audit/log-security-audit.js";
import serializeRoleValue from "../../security-audit/serialize-role-value.js";

/** CLI recovery bypasses admin permission checks because it already has database access. */
const grantSuperAdmin: ServiceFn<
	[
		{
			email: string;
		},
	],
	undefined
> = async (context, data) => {
	const Users = new UsersRepository(context.db);

	const userRes = await Users.selectSinglePreset({
		where: [
			{
				key: "email",
				operator: "=",
				value: normalizeEmailInput(data.email),
			},
			{
				key: "is_deleted",
				operator: "=",
				value: context.config.db.getDefault("boolean", "false"),
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

	if (formatter.formatBoolean(userRes.data.super_admin)) {
		return {
			error: {
				type: "basic",
				status: 400,
				message: copy("server:core.users.super.admin.already.message"),
			},
			data: undefined,
		};
	}

	const roles =
		userRes.data.roles?.map((role) => ({
			id: role.id,
			name: role.name,
		})) ?? [];
	const [previousValueRes, newValueRes, updateRes] = await Promise.all([
		serializeRoleValue(context, { roles, superAdmin: false }),
		serializeRoleValue(context, { roles, superAdmin: true }),
		Users.updateSingle({
			data: {
				super_admin: true,
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
	]);
	if (previousValueRes.error) return previousValueRes;
	if (newValueRes.error) return newValueRes;
	if (updateRes.error) return updateRes;

	await invalidateAuthCache(context);

	const auditRes = await logSecurityAudit(context, {
		userId: userRes.data.id,
		action: constants.securityAudit.actions.roleChange,
		performedBy: null,
		previousValue: previousValueRes.data,
		newValue: newValueRes.data,
	});
	if (auditRes.error) return auditRes;

	return {
		error: undefined,
		data: undefined,
	};
};

export default grantSuperAdmin;
