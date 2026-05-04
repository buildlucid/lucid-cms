import { createMiddleware } from "hono/factory";
import T from "../../../translations/index.js";
import type { LucidHonoContext } from "../../../types/hono.js";
import { LucidAPIError } from "../../../utils/errors/index.js";
import type { CollectionPermissionAction } from "../../collection/builders/collection-builder/types.js";
import { resolveCollectionPermission } from "../../permission/collection-permissions.js";
import hasAccess from "../../permission/has-access.js";

/**
 * Guards collection document routes with the effective permission for the
 * requested collection, including custom collection and environment mappings.
 */
const collectionPermissions = (
	action: CollectionPermissionAction,
	options?: {
		getTarget?: (c: LucidHonoContext) => string | undefined;
	},
) =>
	createMiddleware(async (c: LucidHonoContext, next) => {
		const collectionKey = c.req.param("collectionKey") || c.req.param("key");
		const collection = c
			.get("config")
			.collections.find((item) => item.key === collectionKey);

		if (!collection) {
			throw new LucidAPIError({
				type: "basic",
				name: T("collection_permission_error_name"),
				message: T("collection_not_found_message"),
				status: 404,
			});
		}

		const permission = resolveCollectionPermission({
			collection,
			action,
			target: options?.getTarget?.(c),
		});

		const access = hasAccess({
			user: c.get("auth"),
			requiredPermissions: [permission],
		});
		if (!access) {
			throw new LucidAPIError({
				type: "basic",
				name: T("collection_permission_error_name"),
				message: T("collection_permission_error_message", {
					collection: collection.key,
					action,
				}),
				status: 403,
			});
		}

		return await next();
	});

export default collectionPermissions;
