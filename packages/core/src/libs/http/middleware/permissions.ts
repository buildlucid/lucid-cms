import T from "../../../translations/index.js";
import { LucidAPIError } from "../../../utils/errors/index.js";
import { createMiddleware } from "hono/factory";
import type { Permission } from "../../../types/response.js";
import type { LucidHonoContext } from "../../../types/hono.js";

export const permissionCheck = (
	c: LucidHonoContext,
	permissions: Permission[],
) => {
	const payloadPermissions = c.get("auth").permissions;

	if (c.get("auth").superAdmin) return;
	if (payloadPermissions === undefined) {
		throw new LucidAPIError({
			type: "basic",
			name: T("permission_error_name"),
			message: T("you_do_not_have_permission_to_perform_this_action"),
			status: 403,
		});
	}

	if (permissions) {
		for (const permission of permissions) {
			if (!payloadPermissions.includes(permission)) {
				throw new LucidAPIError({
					type: "basic",
					name: T("permission_error_name"),
					message: T("you_do_not_have_permission_to_perform_this_action"),
					status: 403,
				});
			}
		}
	}
};

const permissions = (permissions: Permission[]) =>
	createMiddleware(async (c: LucidHonoContext, next) => {
		permissionCheck(c, permissions);
		return await next();
	});

export default permissions;
