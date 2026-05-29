import { createMiddleware } from "hono/factory";
import type { LucidHonoContext } from "../../../types/hono.js";
import { LucidAPIError } from "../../../utils/errors/index.js";
import { copy } from "../../i18n/index.js";
import hasAccess from "../../permission/has-access.js";
import type { Permission } from "../../permission/types.js";

export const permissionCheck = (
	c: LucidHonoContext,
	permissions: Permission | Permission[],
) => {
	const requirements = Array.isArray(permissions) ? permissions : [permissions];
	const access = hasAccess({
		user: c.get("auth"),
		requiredPermissions: requirements,
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

const permissions = (permissions: Permission | Permission[]) =>
	createMiddleware(async (c: LucidHonoContext, next) => {
		permissionCheck(c, permissions);
		return await next();
	});

export default permissions;
