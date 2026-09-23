import type { AdminSlot } from "@lucidcms/admin/types";
import fullSlugConfig from "../admin/components/FullSlug/config.js";
import slugCellConfig from "../admin/components/SlugCell/config.js";

const registerAdminSlots = (collection: string): AdminSlot[] => [
	fullSlugConfig(collection),
	slugCellConfig(collection),
];
export default registerAdminSlots;
