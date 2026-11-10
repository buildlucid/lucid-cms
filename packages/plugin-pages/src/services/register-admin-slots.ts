import type { AdminSlot } from "@lucidcms/admin/types";
import pathDisplayConfig from "../admin/components/PathDisplay/config.js";
import previousPathsSectionConfig from "../admin/components/PreviousPathsSection/config.js";
import slugCellConfig from "../admin/components/SlugCell/config.js";
import type { CollectionConfig } from "../types/types.js";

const registerAdminSlots = (collection: CollectionConfig): AdminSlot[] => [
	pathDisplayConfig(collection.key, collection.trackPaths),
	slugCellConfig(collection.key),
	...(collection.trackPaths
		? [previousPathsSectionConfig(collection.key)]
		: []),
];
export default registerAdminSlots;
