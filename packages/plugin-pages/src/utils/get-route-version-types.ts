import type { CollectionBuilder } from "@lucidcms/core";

/** Returns latest and each configured publishing environment for route synchronization. */
const getRouteVersionTypes = (collection: CollectionBuilder) => [
	"latest",
	...collection.getData.publishing.environments.map(
		(environment) => environment.key,
	),
];

export default getRouteVersionTypes;
