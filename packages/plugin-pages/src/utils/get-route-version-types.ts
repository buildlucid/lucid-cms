import type { CollectionDefinition } from "@lucidcms/core/types";

/** Returns latest and each configured publishing environment for route synchronization. */
const getRouteVersionTypes = (collection: CollectionDefinition) => [
	"latest",
	...collection.getData.publishing.environments.map(
		(environment) => environment.key,
	),
];

export default getRouteVersionTypes;
