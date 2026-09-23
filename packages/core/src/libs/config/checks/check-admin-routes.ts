import type { ResolvedLucidConfig } from "../../../types/config.js";
import { requirementPermissions } from "../../permission/match-permissions.js";
import { isRegisteredPermission } from "../../permission/registry.js";

/** Rejects admin routes that require permissions no role can be granted. */
const checkAdminRoutes = (config: ResolvedLucidConfig) => {
	for (const route of config.admin.routes) {
		if (route.access === "public" || route.permission === undefined) continue;

		const unknown = requirementPermissions(route.permission).filter(
			(permission) => !isRegisteredPermission(config, permission),
		);
		if (unknown.length > 0) {
			throw new Error(
				`Admin route "${route.key}" uses unknown permissions: ${unknown.join(", ")}.`,
			);
		}
	}
};

export default checkAdminRoutes;
