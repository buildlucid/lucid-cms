import { hasher } from "node-object-hash";
import type CollectionDefinition from "../../../collection/definitions/collection/index.js";

const hashInstance = hasher({ sort: true, coerce: true });

const createCollectionSnapshot = (collection: CollectionDefinition) => {
	return {
		key: collection.key,
		data: collection.getData,
		fieldTree: collection.fieldTree,
		fixedBricks: collection.fixedBricks,
		builderBricks: collection.builderBricks,
		embeddedBricks: collection.embeddedBricks,
	};
};

export const getCollectionSignature = (collection: CollectionDefinition) => {
	return hashInstance.hash(createCollectionSnapshot(collection));
};
