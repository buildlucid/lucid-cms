import type { SecurityAuditRoleSnapshot } from "../../types/security-audit.js";

export const sortRoleSnapshot = (
	roles: SecurityAuditRoleSnapshot[],
): SecurityAuditRoleSnapshot[] =>
	roles
		.map((role) => ({
			id: role.id,
			name: role.name,
		}))
		.sort((a, b) => a.id - b.id);

export default sortRoleSnapshot;
