import type { CollectionDefinition } from "@lucidcms/core/types";

/** Whether the SEO fields are marked localized: as configured, or following the collection. */
const resolveSeoLocalized = (
	target: { localized?: boolean },
	collection: CollectionDefinition,
) =>
	target.localized ??
	(collection.config.localized !== false &&
		collection.config.localized !== undefined);

export default resolveSeoLocalized;
