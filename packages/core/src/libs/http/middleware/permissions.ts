import { createMiddleware } from "hono/factory";
import T from "../../../translations/index.js";
import type { LucidHonoContext } from "../../../types/hono.js";
import { LucidAPIError } from "../../../utils/errors/index.js";
import hasAccess from "../../permission/has-access.js";
import type { Permission } from "../../permission/types.js";

export const permissionCheck = (
	c: LucidHonoContext,
	permissions: Permission[],
) => {
	const access = hasAccess({
		user: c.get("auth"),
		requiredPermissions: permissions,
	});
	if (!access) {
		throw new LucidAPIError({
			type: "basic",
			name: T("permission_error_name"),
			message: T("you_do_not_have_permission_to_perform_this_action"),
			status: 403,
		});
	}
};

const permissions = (permissions: Permission[]) =>
	createMiddleware(async (c: LucidHonoContext, next) => {
		permissionCheck(c, permissions);
		return await next();
	});

export default permissions;
