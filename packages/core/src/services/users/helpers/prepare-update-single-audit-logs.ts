import constants from "../../../constants/constants.js";
import type { BooleanInt } from "../../../libs/db-adapter/types.js";
import formatter from "../../../libs/formatters/index.js";
import { RolesRepository } from "../../../libs/repositories/index.js";
import type {
	SecurityAuditAction,
	SecurityAuditRoleSnapshot,
} from "../../../types/security-audit.js";
import { sortRoleSnapshot } from "../../../utils/security-audit/sort-role-snapshot.js";
import type {
	ServiceContext,
	ServiceFn,
	ServiceResponse,
} from "../../../utils/services/types.js";
import * as securityAuditServices from "../../security-audit/index.js";

type SecurityAuditLogData = {
	userId: number;
	action: SecurityAuditAction;
	performedBy: number;
	previousValue: string;
	newValue: string;
};

type RoleAuditState = {
	previousRoles: SecurityAuditRoleSnapshot[];
	nextRoleIds: number[];
	rolesChanged: boolean;
	previousSuperAdmin: boolean;
	nextSuperAdmin: boolean;
};

type EmailChange = {
	previousValue: string;
	newValue: string;
};

const sortRoleIds = (roleIds: number[]) => [...roleIds].sort((a, b) => a - b);

const roleIdsMatch = (previousRoleIds: number[], nextRoleIds: number[]) =>
	previousRoleIds.length === nextRoleIds.length &&
	previousRoleIds.every((roleId, index) => roleId === nextRoleIds[index]);

const getUpdateAuditState = (props: {
	currentEmail: string;
	currentRoles: SecurityAuditRoleSnapshot[];
	currentSuperAdmin: boolean;
	normalizedEmail?: string;
	roleIds?: number[];
	superAdmin?: boolean;
	canUpdateSuperAdmin: boolean;
}) => {
	const previousRoles = sortRoleSnapshot(props.currentRoles);
	const previousRoleIds = sortRoleIds(previousRoles.map((role) => role.id));
	const nextRoleIds =
		props.roleIds !== undefined ? sortRoleIds(props.roleIds) : previousRoleIds;
	const rolesChanged =
		props.roleIds !== undefined &&
		roleIdsMatch(previousRoleIds, nextRoleIds) === false;
	const nextSuperAdmin =
		props.canUpdateSuperAdmin && props.superAdmin !== undefined
			? props.superAdmin
			: props.currentSuperAdmin;
	const superAdminChanged = props.currentSuperAdmin !== nextSuperAdmin;

	return {
		emailChange:
			props.normalizedEmail !== undefined &&
			props.normalizedEmail !== props.currentEmail
				? {
						previousValue: props.currentEmail,
						newValue: props.normalizedEmail,
					}
				: undefined,
		roleChange:
			rolesChanged || superAdminChanged
				? {
						previousRoles,
						nextRoleIds,
						rolesChanged,
						previousSuperAdmin: props.currentSuperAdmin,
						nextSuperAdmin,
					}
				: undefined,
	};
};

const resolveNextRoleSnapshot = async (
	context: ServiceContext,
	roleChange: RoleAuditState,
): ServiceResponse<SecurityAuditRoleSnapshot[]> => {
	if (roleChange.rolesChanged === false) {
		return {
			error: undefined,
			data: roleChange.previousRoles,
		};
	}

	if (roleChange.nextRoleIds.length === 0) {
		return {
			error: undefined,
			data: [],
		};
	}

	const Roles = new RolesRepository(context.db.client, context.config.db);
	const rolesRes = await Roles.selectMultiple({
		select: ["id", "name"],
		where: [
			{
				key: "id",
				operator: "in",
				value: roleChange.nextRoleIds,
			},
		],
		validation: {
			enabled: true,
		},
	});
	if (rolesRes.error) return rolesRes;

	return {
		error: undefined,
		data: sortRoleSnapshot(rolesRes.data),
	};
};

const prepareUpdateSingleAuditLogs: ServiceFn<
	[
		{
			userId: number;
			performedBy: number;
			currentUser: {
				email: string;
				superAdmin: BooleanInt;
				roles: SecurityAuditRoleSnapshot[];
			};
			normalizedEmail?: string;
			passwordChanged: boolean;
			roleIds?: number[];
			superAdmin?: boolean;
			canUpdateSuperAdmin: boolean;
		},
	],
	{
		emailChange?: EmailChange;
		logs: SecurityAuditLogData[];
	}
> = async (context, data) => {
	const auditState = getUpdateAuditState({
		currentEmail: data.currentUser.email,
		currentRoles: data.currentUser.roles,
		currentSuperAdmin: formatter.formatBoolean(data.currentUser.superAdmin),
		normalizedEmail: data.normalizedEmail,
		roleIds: data.roleIds,
		superAdmin: data.superAdmin,
		canUpdateSuperAdmin: data.canUpdateSuperAdmin,
	});
	const logs: SecurityAuditLogData[] = [];

	if (auditState.emailChange) {
		logs.push({
			userId: data.userId,
			action: constants.securityAudit.actions.emailChange,
			performedBy: data.performedBy,
			previousValue: auditState.emailChange.previousValue,
			newValue: auditState.emailChange.newValue,
		});
	}

	if (data.passwordChanged) {
		logs.push({
			userId: data.userId,
			action: constants.securityAudit.actions.passwordChange,
			performedBy: data.performedBy,
			previousValue: constants.securityAudit.redactedValue,
			newValue: constants.securityAudit.redactedValue,
		});
	}

	if (auditState.roleChange) {
		const nextRolesRes = await resolveNextRoleSnapshot(
			context,
			auditState.roleChange,
		);
		if (nextRolesRes.error) return nextRolesRes;

		const [previousValueRes, newValueRes] = await Promise.all([
			securityAuditServices.serializeRoleValue(context, {
				roles: auditState.roleChange.previousRoles,
				superAdmin: auditState.roleChange.previousSuperAdmin,
			}),
			securityAuditServices.serializeRoleValue(context, {
				roles: nextRolesRes.data,
				superAdmin: auditState.roleChange.nextSuperAdmin,
			}),
		]);
		if (previousValueRes.error) return previousValueRes;
		if (newValueRes.error) return newValueRes;

		logs.push({
			userId: data.userId,
			action: constants.securityAudit.actions.roleChange,
			performedBy: data.performedBy,
			previousValue: previousValueRes.data,
			newValue: newValueRes.data,
		});
	}

	return {
		error: undefined,
		data: {
			emailChange: auditState.emailChange,
			logs,
		},
	};
};

export default prepareUpdateSingleAuditLogs;
