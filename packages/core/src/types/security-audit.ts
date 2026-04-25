import type constants from "../constants/constants.js";

export type SecurityAuditAction =
	(typeof constants.securityAudit.actions)[keyof typeof constants.securityAudit.actions];

export type SecurityAuditRoleSnapshot = {
	id: number;
	name: string;
};

export type SecurityAuditRoleValue = {
	roles: SecurityAuditRoleSnapshot[];
	superAdmin: boolean;
};
