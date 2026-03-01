import { createHash } from "node:crypto";
import type CollectionBuilder from "../builders/collection-builder/index.js";

const jsonReplacer = (_key: string, value: unknown) => {
	if (typeof value === "function" || typeof value === "symbol") {
		return undefined;
	}

	if (typeof value === "bigint") {
		return value.toString();
	}

	return value;
};

const createCollectionSnapshot = (collection: CollectionBuilder) => {
	return {
		key: collection.key,
		data: collection.getData,
		fieldTree: collection.fieldTree,
		fixedBricks: collection.fixedBricks,
		builderBricks: collection.builderBricks,
	};
};

const hashSnapshot = (snapshot: unknown) => {
	const payload = JSON.stringify(snapshot, jsonReplacer);

	return createHash("sha1").update(payload).digest("hex");
};

export const getCollectionSignature = (collection: CollectionBuilder) => {
	return hashSnapshot(createCollectionSnapshot(collection));
};

export const getCollectionsSignature = (collections: CollectionBuilder[]) => {
	return hashSnapshot(
		collections
			.map((collection) => createCollectionSnapshot(collection))
			.sort((a, b) => a.key.localeCompare(b.key)),
	);
};
