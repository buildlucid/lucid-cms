import type { AdminSlot } from "@lucidcms/admin/types";
import pathDisplayConfig from "../admin/components/PathDisplay/config.js";
import slugCellConfig from "../admin/components/SlugCell/config.js";

const registerAdminSlots = (collection: string): AdminSlot[] => [
	pathDisplayConfig(collection),
	slugCellConfig(collection),
];
export default registerAdminSlots;
