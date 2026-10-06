import type CollectionBuilder from "../../../libs/collection/builders/collection-builder/index.js";
import type { ReleaseType } from "../../../libs/db/tables/releases.js";

/**
 * Create releases always land their new document in latest. For publish
 * releases, proposals target environments and environment snapshots move
 * forward through configured targets.
 */
const getAllowedTargets = (data: {
	collection: CollectionBuilder;
	type: ReleaseType;
	source: string;
}): string[] => {
	if (data.type === "create") return ["latest"];

	const environments = data.collection.getData.publishing.targets.map(
		(target) => target.key,
	);
	if (data.source === "latest") return environments;
	const index = environments.indexOf(data.source);
	return index === -1 ? [] : environments.slice(index + 1);
};

export default getAllowedTargets;
