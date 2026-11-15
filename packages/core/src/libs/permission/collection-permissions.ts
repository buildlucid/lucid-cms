import type CollectionDefinition from "../collection/definitions/collection/index.js";
import type {
	CollectionPermission,
	CollectionPermissionAction,
} from "./types.js";

/**
 * Collection permission actions used to derive `CollectionPermissionAction`, in the order the roles screen lists them.
 * @remarks The `-request` actions take effect only when their requests complete.
 */
export const collectionPermissionActions = [
	"read",
	"create",
	"create-request",
	"update",
	"update-request",
	"restore",
	"publish",
	"publish-request",
	"review",
	"delete",
	"delete-request",
] as const;

/**
 * Actions people can take directly or ask for through a request. Each has a `-request`
 * permission, and the direct permission also lets someone ask. `publish` covers unpublishing.
 */
export const requestableActions = [
	"create",
	"update",
	"publish",
	"delete",
] as const;

export type RequestableAction = (typeof requestableActions)[number];

/** Builds a collection permission key, eg. `documents:pages:read`. */
export const getCollectionPermission = <
	TAction extends CollectionPermissionAction,
>(
	collectionKey: string,
	action: TAction,
): CollectionPermission<TAction> => `documents:${collectionKey}:${action}`;

/** Builds a collection permission key from a collection. */
export const resolveCollectionPermission = <
	TAction extends CollectionPermissionAction,
>(params: {
	collection: CollectionDefinition;
	action: TAction;
}): CollectionPermission<TAction> => {
	return getCollectionPermission(params.collection.key, params.action);
};

/** Every permission for a collection, keyed in camelCase as the API returns them. */
export const resolveCollectionPermissions = (
	collection: CollectionDefinition,
) => ({
	read: getCollectionPermission(collection.key, "read"),
	create: getCollectionPermission(collection.key, "create"),
	createRequest: getCollectionPermission(collection.key, "create-request"),
	update: getCollectionPermission(collection.key, "update"),
	updateRequest: getCollectionPermission(collection.key, "update-request"),
	delete: getCollectionPermission(collection.key, "delete"),
	deleteRequest: getCollectionPermission(collection.key, "delete-request"),
	restore: getCollectionPermission(collection.key, "restore"),
	publish: getCollectionPermission(collection.key, "publish"),
	publishRequest: getCollectionPermission(collection.key, "publish-request"),
	review: getCollectionPermission(collection.key, "review"),
});
