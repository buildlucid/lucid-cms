import { getCollectionPermission } from "../../../libs/permission/collection-permissions.js";
import { Permissions } from "../../../libs/permission/definitions.js";
import hasAccess from "../../../libs/permission/has-access.js";
import { limitCollections } from "../../../libs/permission/readable-collections.js";
import type { CollectionPermissionAction } from "../../../libs/permission/types.js";
import type { LucidActor } from "../../../types/hono.js";
import type { ServiceContext } from "../../../utils/services/types.js";

/** Resolves collection access for request lists and counts, requiring every document to belong to the supplied collections. */
const getListAccess = (
	context: ServiceContext,
	user: LucidActor,
	only?: readonly string[],
) => {
	const collectionKeys = (action: CollectionPermissionAction) =>
		user.superAdmin && !only
			? null
			: limitCollections(context.config.collections, only)
					.filter((collection) =>
						hasAccess({
							user,
							requiredPermissions: [
								getCollectionPermission(collection.key, action),
							],
						}),
					)
					.map((collection) => collection.key);

	return {
		userId: user.id,
		collectionKeys: hasAccess({
			user,
			requiredPermissions: [Permissions.RequestsRead],
		})
			? collectionKeys("read")
			: [],
		updateKeys: collectionKeys("update"),
	};
};

export default getListAccess;
