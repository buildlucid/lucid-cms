import { createMiddleware } from "hono/factory";
import type { LucidHonoContext } from "../../../types/hono.js";
import { LucidAPIError } from "../../../utils/errors/index.js";
import { copy } from "../../i18n/index.js";
import {
	matchPermissions,
	requirementPermissions,
} from "../../permission/match-permissions.js";
import { isRegisteredPermission } from "../../permission/registry.js";
import type { PermissionRequirement } from "../../permission/types.js";

export const permissionCheck = (
	c: LucidHonoContext,
	requirement: PermissionRequirement,
) => {
	const config = c.get("config");
	const user = c.get("auth");

	const access =
		requirementPermissions(requirement).every((permission) =>
			isRegisteredPermission(config, permission),
		) &&
		user !== undefined &&
		(user.superAdmin ||
			(user.permissions !== undefined &&
				matchPermissions(user.permissions, requirement)));

	if (!access) {
		throw new LucidAPIError({
			type: "basic",
			name: copy("server:core.permissions.error.name"),
			message: copy("server:core.permissions.denied"),
			status: 403,
		});
	}
};

/**
 * Requires the current admin user to meet a permission requirement. Register authentication first.
 *
 * @example
 * ```ts
 * permissions("reports:read");
 * permissions(["reports:read", "reports:export"]);
 * permissions({ some: ["reports:read", ["media:read", "media:update"]] });
 * ```
 */
const permissions = (requirement: PermissionRequirement) =>
	createMiddleware(async (c: LucidHonoContext, next) => {
		permissionCheck(c, requirement);
		return await next();
	});

export default permissions;
