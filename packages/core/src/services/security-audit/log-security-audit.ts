import formatter from "../../libs/formatters/index.js";
import {
	SecurityAuditLogsRepository,
	UsersRepository,
} from "../../libs/repositories/index.js";
import type { SecurityAuditAction } from "../../types/security-audit.js";
import { sortRoleSnapshot } from "../../utils/security-audit/sort-role-snapshot.js";
import type { ServiceFn } from "../../utils/services/types.js";

const logSecurityAudit: ServiceFn<
	[
		{
			userId: number;
			action: SecurityAuditAction;
			performedBy: number;
			previousValue: string;
			newValue: string;
		},
	],
	number
> = async (context, data) => {
	const Users = new UsersRepository(context.db.client, context.config.db);
	const SecurityAuditLogs = new SecurityAuditLogsRepository(
		context.db.client,
		context.config.db,
	);

	const actorRes = await Users.selectAuditActorById({
		id: data.performedBy,
		defaultLocale: context.config.localization.defaultLocale,
		validation: {
			enabled: true,
		},
	});
	if (actorRes.error) return actorRes;

	const createRes = await SecurityAuditLogs.createSingle({
		data: {
			user_id: data.userId,
			action: data.action,
			performed_by: data.performedBy,
			performed_by_roles: sortRoleSnapshot(
				actorRes.data.roles?.map((role) => ({
					id: role.id,
					name: role.name ?? "",
				})) ?? [],
			),
			performed_by_super_admin: formatter.formatBoolean(
				actorRes.data.super_admin,
			),
			ip_address: context.request.ipAddress ?? "unknown",
			previous_value: data.previousValue,
			new_value: data.newValue,
		},
		returning: ["id"],
		validation: {
			enabled: true,
		},
	});
	if (createRes.error) return createRes;

	return {
		error: undefined,
		data: createRes.data.id,
	};
};

export default logSecurityAudit;
