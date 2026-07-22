import { createMiddleware } from "hono/factory";
import type { LucidHonoContext } from "../../../types/hono.js";
import { LucidAPIError } from "../../../utils/errors/index.js";
import { copy } from "../../i18n/index.js";
import { resolveCollectionPermission } from "../../permission/collection-permissions.js";
import hasAccess from "../../permission/has-access.js";
import type { CollectionPermissionAction } from "../../permission/types.js";

/**
 * Guards collection document routes with the generated permission for the
 * requested collection.
 */
const collectionPermissions = (
	action: CollectionPermissionAction,
	options?: {
		getCollectionKey?: (c: LucidHonoContext) => string | undefined;
	},
) =>
	createMiddleware(async (c: LucidHonoContext, next) => {
		const collectionKey =
			options?.getCollectionKey?.(c) ||
			c.req.param("collectionKey") ||
			c.req.param("key");
		const collection = c
			.get("config")
			.collections.find((item) => item.key === collectionKey);

		if (!collection) {
			throw new LucidAPIError({
				type: "basic",
				name: copy("server:core.collections.permission.error.name"),
				message: copy("server:core.collections.not.found.message"),
				status: 404,
			});
		}

		const permission = resolveCollectionPermission({
			collection,
			action,
		});

		const access = hasAccess({
			user: c.get("auth"),
			requiredPermissions: [permission],
		});
		if (!access) {
			throw new LucidAPIError({
				type: "basic",
				name: copy("server:core.collections.permission.error.name"),
				message: copy("server:core.collections.permission.error.message", {
					data: {
						collection: collection.key,
						action,
					},
				}),
				status: 403,
			});
		}

		return await next();
	});

export default collectionPermissions;
