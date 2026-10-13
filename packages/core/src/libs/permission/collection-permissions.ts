import type CollectionBuilder from "../collection/builders/collection-builder/index.js";
import type {
	CollectionPermission,
	CollectionPermissionAction,
} from "./types.js";

/**
 * Collection permission actions used to derive `CollectionPermissionAction`.
 * @remarks The `-request` actions take effect only when their requests complete.
 */
export const collectionPermissionActions = [
	"read",
	"create",
	"create-request",
	"update",
	"delete",
	"delete-request",
	"unpublish-request",
	"restore",
	"publish",
	"review",
] as const;

/** Builds a collection permission key, eg. `documents:pages:read`. */
export const getCollectionPermission = <
	TAction extends CollectionPermissionAction,
>(
	collectionKey: string,
	action: TAction,
): CollectionPermission<TAction> => `documents:${collectionKey}:${action}`;

/** Builds a collection permission key from a collection builder. */
export const resolveCollectionPermission = <
	TAction extends CollectionPermissionAction,
>(params: {
	collection: CollectionBuilder;
	action: TAction;
}): CollectionPermission<TAction> => {
	return getCollectionPermission(params.collection.key, params.action);
};

/** Every permission for a collection, keyed in camelCase as the API returns them. */
export const resolveCollectionPermissions = (
	collection: CollectionBuilder,
) => ({
	read: getCollectionPermission(collection.key, "read"),
	create: getCollectionPermission(collection.key, "create"),
	createRequest: getCollectionPermission(collection.key, "create-request"),
	update: getCollectionPermission(collection.key, "update"),
	delete: getCollectionPermission(collection.key, "delete"),
	deleteRequest: getCollectionPermission(collection.key, "delete-request"),
	unpublishRequest: getCollectionPermission(
		collection.key,
		"unpublish-request",
	),
	restore: getCollectionPermission(collection.key, "restore"),
	publish: getCollectionPermission(collection.key, "publish"),
	review: getCollectionPermission(collection.key, "review"),
});
