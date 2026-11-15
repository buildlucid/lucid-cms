import type CollectionDefinition from "../../../libs/collection/definitions/collection/index.js";
import { getCollectionPermission } from "../../../libs/permission/collection-permissions.js";
import hasAccess from "../../../libs/permission/has-access.js";
import type { LucidActor } from "../../../types/hono.js";
import requiresReview from "./requires-review.js";

/**
 * Resolves direct, proposed or denied access to latest content. Collections requiring update
 * review allow proposals only.
 */
const getLatestAccess = (
	collection: CollectionDefinition,
	user: LucidActor,
): "direct" | "request" | null => {
	const update = getCollectionPermission(collection.key, "update");
	if (
		!requiresReview(collection, { type: "update" }) &&
		hasAccess({ user, requiredPermissions: [update] })
	) {
		return "direct";
	}

	return hasAccess({
		user,
		optionalPermissions: [
			update,
			getCollectionPermission(collection.key, "update-request"),
		],
	})
		? "request"
		: null;
};

export default getLatestAccess;
