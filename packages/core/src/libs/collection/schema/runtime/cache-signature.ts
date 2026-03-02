import { hasher } from "node-object-hash";
import type CollectionBuilder from "../../../builders/collection-builder/index.js";

const hashInstance = hasher({ sort: true, coerce: true });

const createCollectionSnapshot = (collection: CollectionBuilder) => {
	return {
		key: collection.key,
		data: collection.getData,
		fieldTree: collection.fieldTree,
		fixedBricks: collection.fixedBricks,
		builderBricks: collection.builderBricks,
	};
};

export const getCollectionSignature = (collection: CollectionBuilder) => {
	return hashInstance.hash(createCollectionSnapshot(collection));
};

export const getCollectionsSignature = (collections: CollectionBuilder[]) => {
	return hashInstance.hash(
		collections
			.map((collection) => createCollectionSnapshot(collection))
			.sort((a, b) => a.key.localeCompare(b.key)),
	);
};
