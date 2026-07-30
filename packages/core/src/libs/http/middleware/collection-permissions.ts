import { createMiddleware } from "hono/factory";
import type { LucidHonoContext } from "../../../types/hono.js";
import { LucidAPIError } from "../../../utils/errors/index.js";
import collections from "../../collection/collections.js";
import { copy } from "../../i18n/index.js";
import { resolveCollectionPermission } from "../../permission/collection-permissions.js";
import hasAccess from "../../permission/has-access.js";
import type { CollectionPermissionAction } from "../../permission/types.js";
import createServiceContext from "../utils/create-service-context.js";

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

		const context = createServiceContext(c);
		const collectionRes = await collections.getSingle(context, {
			key: collectionKey ?? "",
		});

		if (collectionRes.error) {
			throw new LucidAPIError({
				...collectionRes.error,
				name: copy("server:core.collections.permission.error.name"),
			});
		}
		const collection = collectionRes.data;

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
