import T from "../../translations/index.js";
import type { SecurityAuditRoleValue } from "../../types/security-audit.js";
import { sortRoleSnapshot } from "../../utils/security-audit/sort-role-snapshot.js";
import type { ServiceFn } from "../../utils/services/types.js";

const serializeRoleValue: ServiceFn<[SecurityAuditRoleValue], string> = async (
	_context,
	data,
) => {
	try {
		return {
			error: undefined,
			data: JSON.stringify({
				roles: sortRoleSnapshot(data.roles),
				superAdmin: data.superAdmin,
			}),
		};
	} catch {
		return {
			error: {
				type: "basic",
				status: 500,
				message: T("default_error_message"),
			},
			data: undefined,
		};
	}
};

export default serializeRoleValue;
