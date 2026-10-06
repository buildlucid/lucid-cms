import { getCollectionPermission } from "../../../libs/permission/collection-permissions.js";
import hasAccess from "../../../libs/permission/has-access.js";
import type { LucidUser } from "../../../types/hono.js";
import type { ServiceContext } from "../../../utils/services/types.js";

/** The collection access that request lists and counts are filtered by. */
const getListAccess = (context: ServiceContext, user: LucidUser) => ({
	userId: user.id,
	collectionKeys: user.superAdmin
		? null
		: context.config.collections
				.filter((collection) =>
					hasAccess({
						user,
						requiredPermissions: [
							getCollectionPermission(collection.key, "read"),
						],
					}),
				)
				.map((collection) => collection.key),
});

export default getListAccess;
