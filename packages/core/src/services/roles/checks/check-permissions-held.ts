import { copy } from "../../../libs/i18n/index.js";
import hasPermission from "../../../libs/permission/has-permission.js";
import { getValidPermissions } from "../../../libs/permission/registry.js";
import type { LucidAuth } from "../../../types/hono.js";
import type {
	ServiceContext,
	ServiceResponse,
} from "../../../utils/services/types.js";

/**
 * Requires the actor to hold every registered permission. Unknown keys grant no access and are
 * ignored.
 */
const checkPermissionsHeld = (
	context: ServiceContext,
	data: {
		auth: Pick<LucidAuth, "superAdmin" | "permissions">;
		permissions: string[];
	},
): Awaited<ServiceResponse<undefined>> => {
	const registered = new Set(getValidPermissions(context.config));
	const grant = {
		superAdmin: data.auth.superAdmin,
		permissions: data.auth.permissions ?? [],
	};
	const held = data.permissions.every(
		(permission) =>
			!registered.has(permission) || hasPermission(grant, permission),
	);
	if (held) return { error: undefined, data: undefined };

	return {
		error: {
			type: "forbidden",
			status: 403,
			message: copy("server:core.roles.permissions.not.held"),
		},
		data: undefined,
	};
};

export default checkPermissionsHeld;
