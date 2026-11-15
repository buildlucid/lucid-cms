import type { Collection } from "@types";
import userStore from "@/store/userStore/userStore";

/** Collections the user can start a new document in. Singles that exist already are left out. */
export const getCreatableCollections = (collections: Collection[]) =>
	collections.filter(
		(collection) =>
			!collection.locked &&
			userStore.get.hasPermission([collection.permissions.create]).all &&
			!(collection.mode === "single" && collection.documentId),
	);

/** Whether someone can open a single collection: read its document, which locks for people who can't change it, or create it. */
export const canOpenSingle = (collection: Collection) =>
	userStore.get.hasPermission([collection.permissions.read]).all &&
	(!!collection.documentId ||
		userStore.get.hasPermission([collection.permissions.create]).all);

/** Collections the user can open. A single without its document also needs permission to create it. */
export const getReadableCollections = (collections: Collection[]) =>
	collections.filter((collection) =>
		collection.mode === "single"
			? canOpenSingle(collection)
			: userStore.get.hasPermission([collection.permissions.read]).all,
	);
