import type CollectionBuilder from "../../../libs/collection/builders/collection-builder/index.js";
import type { RequestType } from "../../../libs/db/tables/requests.js";

/** Lists allowed destinations for the request type and source, excluding targets for delete requests. */
const getAllowedTargets = (data: {
	collection: CollectionBuilder;
	type: RequestType;
	source: string | null;
}): string[] => {
	if (data.type === "create") return ["latest"];
	if (data.type === "delete") return [];

	const environments = data.collection.getData.publishing.targets.map(
		(target) => target.key,
	);
	if (data.type === "unpublish") return environments;
	if (data.source === null) return [];
	if (data.source === "latest") return ["latest", ...environments];
	const index = environments.indexOf(data.source);
	return index === -1 ? [] : environments.slice(index + 1);
};

export default getAllowedTargets;
