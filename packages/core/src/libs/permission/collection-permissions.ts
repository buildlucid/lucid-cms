import type CollectionBuilder from "../collection/builders/collection-builder/index.js";
import type {
	CollectionPermissionAction,
	CollectionPermissions,
} from "../collection/builders/collection-builder/types.js";
import { Permissions } from "./definitions.js";
import type { Permission } from "./types.js";

/**
 * Resolves the effective permission required for a collection document action.
 * Collection-level mappings replace Lucid's core document permissions, while
 * publish can be overridden per target environment.
 */
export const documentActionPermissions = {
	read: Permissions.DocumentsRead,
	create: Permissions.DocumentsCreate,
	update: Permissions.DocumentsUpdate,
	delete: Permissions.DocumentsDelete,
	restore: Permissions.DocumentsRestore,
	publish: Permissions.DocumentsPublish,
	review: Permissions.DocumentsReview,
} satisfies Record<CollectionPermissionAction, Permission>;

/**
 * Resolves one document action to its custom collection permission or core fallback.
 */
export const resolveCollectionPermission = (params: {
	collection: CollectionBuilder;
	action: CollectionPermissionAction;
	target?: string;
}): Permission => {
	const collectionData = params.collection.getData;

	if (
		(params.action === "publish" || params.action === "review") &&
		params.target !== undefined
	) {
		const environment = collectionData.config.environments.find(
			(env) => env.key === params.target,
		);
		const permission = environment?.permissions[params.action];
		if (permission) return permission;
	}

	return (
		collectionData.permissions[params.action] ??
		documentActionPermissions[params.action]
	);
};

/**
 * Expands every document action for a collection so API responses and UI checks match.
 */
export const resolveCollectionPermissions = (
	collection: CollectionBuilder,
): Required<CollectionPermissions> => {
	return {
		read: resolveCollectionPermission({ collection, action: "read" }),
		create: resolveCollectionPermission({ collection, action: "create" }),
		update: resolveCollectionPermission({ collection, action: "update" }),
		delete: resolveCollectionPermission({ collection, action: "delete" }),
		restore: resolveCollectionPermission({ collection, action: "restore" }),
		publish: resolveCollectionPermission({ collection, action: "publish" }),
		review: resolveCollectionPermission({
			collection,
			action: "review",
		}),
	};
};
