import type CollectionBuilder from "../collection/builders/collection-builder/index.js";
import type {
	CollectionPermission,
	CollectionPermissionAction,
} from "./types.js";

type CollectionPermissions = {
	[TAction in CollectionPermissionAction]: CollectionPermission<TAction>;
};

export const collectionPermissionActions = [
	"read",
	"create",
	"update",
	"delete",
	"restore",
	"publish",
	"review",
] as const satisfies CollectionPermissionAction[];

/** Builds the canonical document permission for one registered collection. */
export const getCollectionPermission = <
	TAction extends CollectionPermissionAction,
>(
	collectionKey: string,
	action: TAction,
): CollectionPermission<TAction> => `documents:${collectionKey}:${action}`;

/** Resolves the document permission required for a collection action. */
export const resolveCollectionPermission = <
	TAction extends CollectionPermissionAction,
>(params: {
	collection: CollectionBuilder;
	action: TAction;
}): CollectionPermission<TAction> => {
	return getCollectionPermission(params.collection.key, params.action);
};

/** Expands every generated document permission for a collection. */
export const resolveCollectionPermissions = (
	collection: CollectionBuilder,
): CollectionPermissions => {
	return Object.fromEntries(
		collectionPermissionActions.map((action) => [
			action,
			getCollectionPermission(collection.key, action),
		]),
	) as CollectionPermissions;
};
