import { documentSlotKeys, fieldSlotKeys } from "@lucidcms/admin/slots";
import type { AdminSlot } from "@lucidcms/admin/types";
import { PLUGIN_KEY } from "../constants.js";

/** Presents computed paths alongside the slug instead of as a separate field. */
const registerAdminSlots = (collection: string): AdminSlot[] => [
	{
		key: `${PLUGIN_KEY}:${collection}:path`,
		slot: fieldSlotKeys.after,
		match: { collection, kind: "collection-fields", field: "slug" },
		component: {
			module: "@lucidcms/plugin-pages/components",
			export: "FullSlug",
		},
	},
	{
		key: `${PLUGIN_KEY}:${collection}:slug-column`,
		slot: documentSlotKeys.columnOverride,
		match: { collection, field: "slug" },
		component: {
			module: "@lucidcms/plugin-pages/components",
			export: "SlugCell",
		},
	},
];
export default registerAdminSlots;
