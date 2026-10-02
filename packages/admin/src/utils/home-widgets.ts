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

/** Collections the user can open. A single also needs permission to edit or create its document. */
export const getReadableCollections = (collections: Collection[]) =>
	collections.filter((collection) =>
		collection.mode === "single"
			? userStore.get.hasPermission([
					collection.permissions.read,
					collection.documentId
						? collection.permissions.update
						: collection.permissions.create,
				]).all
			: userStore.get.hasPermission([collection.permissions.read]).all,
	);
