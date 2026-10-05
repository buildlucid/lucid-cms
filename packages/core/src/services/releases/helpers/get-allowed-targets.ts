import type CollectionBuilder from "../../../libs/collection/builders/collection-builder/index.js";

/** Proposals target environments; environment snapshots move forward through configured targets. */
const getAllowedTargets = (
	collection: CollectionBuilder,
	source: string,
): string[] => {
	const environments = collection.getData.publishing.targets.map(
		(target) => target.key,
	);
	if (source === "latest") return environments;
	const index = environments.indexOf(source);
	return index === -1 ? [] : environments.slice(index + 1);
};

export default getAllowedTargets;
