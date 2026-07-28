import type { LucidAuth } from "../../types/hono.js";
import type { OAuthConnection } from "../../types/response.js";
import { Permissions } from "./definitions.js";
import hasAccess from "./has-access.js";
import type { StaticPermission } from "./types.js";

/**
 * Checks whether an admin can update or revoke an OAuth connection.
 */
export const canManageOAuthConnection = (input: {
	connection: OAuthConnection;
	auth: LucidAuth;
	tenantKey: string | null;
	multiTenant: boolean;
	systemPermission: StaticPermission;
}) => {
	const hasTenantAccess =
		!input.multiTenant ||
		input.auth.superAdmin ||
		(input.connection.tenantKey !== null &&
			input.connection.tenantKey === input.tenantKey);

	if (input.connection.principalType === "user") {
		return (
			input.connection.userId === input.auth.id ||
			(hasAccess({
				user: input.auth,
				requiredPermissions: [Permissions.UsersUpdate],
			}) &&
				hasTenantAccess)
		);
	}

	return (
		hasAccess({
			user: input.auth,
			requiredPermissions: [input.systemPermission],
		}) && hasTenantAccess
	);
};
