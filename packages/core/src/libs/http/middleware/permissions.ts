import { createMiddleware } from "hono/factory";
import type { LucidHonoContext } from "../../../types/hono.js";
import { LucidAPIError } from "../../../utils/errors/index.js";
import { copy } from "../../i18n/index.js";
import hasAccess from "../../permission/has-access.js";
import { isRegisteredPermission } from "../../permission/registry.js";
import type { Permission } from "../../permission/types.js";

export const permissionCheck = (
	c: LucidHonoContext,
	permissions: Permission | readonly Permission[],
) => {
	const requirements =
		typeof permissions === "string" ? [permissions] : permissions;
	const config = c.get("config");

	const access =
		requirements.every((permission) =>
			isRegisteredPermission(config, permission),
		) &&
		hasAccess({
			user: c.get("auth"),
			requiredPermissions: [...requirements],
		});

	if (!access) {
		throw new LucidAPIError({
			type: "basic",
			name: copy("server:core.permissions.error.name"),
			message: copy("server:core.permissions.denied"),
			status: 403,
		});
	}
};

/** Requires the current admin user to have every supplied permission. Register authentication first. */
const permissions = (permissions: Permission | readonly Permission[]) =>
	createMiddleware(async (c: LucidHonoContext, next) => {
		permissionCheck(c, permissions);
		return await next();
	});

export default permissions;
