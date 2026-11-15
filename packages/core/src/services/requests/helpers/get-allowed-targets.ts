import type CollectionDefinition from "../../../libs/collection/definitions/collection/index.js";
import type { RequestType } from "../../../libs/db/tables/requests.js";

/**
 * Lists writable targets for a request type and source, in publishing order.
 * Create and update requests land in latest, publish requests move content to
 * the environments after their source, and delete requests have none.
 */
const getAllowedTargets = (data: {
	collection: CollectionDefinition;
	type: RequestType;
	source: string | null;
}): string[] => {
	if (data.type === "create" || data.type === "update") return ["latest"];
	if (data.type === "delete") return [];

	const environments = data.collection.getData.publishing.environments.map(
		(environment) => environment.key,
	);
	if (data.type === "unpublish") return environments;
	if (data.source === null) return [];
	if (data.source === "latest") return environments;
	const index = environments.indexOf(data.source);
	return index === -1 ? [] : environments.slice(index + 1);
};

export default getAllowedTargets;
