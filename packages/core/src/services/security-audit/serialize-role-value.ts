import { copy } from "../../libs/i18n/index.js";
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
				message: copy("server:core.errors.default.message"),
			},
			data: undefined,
		};
	}
};

export default serializeRoleValue;
