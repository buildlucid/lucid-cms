import { brickSlotKeys, fieldSlotKeys } from "@lucidcms/admin/slots";
import type { AdminSlot } from "@lucidcms/admin/types";
import { fields, PLUGIN_KEY } from "../constants.js";

/** Package exports are resolved by the admin compiler without loading Solid on the server. */
const registerAdminSlots = (collection: string, brick: string): AdminSlot[] => {
	const match = { collection, brick, kind: "fixed" } as const;
	const key = `${PLUGIN_KEY}:${collection}:${brick}`;

	return [
		{
			key: `${key}:preview`,
			slot: brickSlotKeys.right,
			width: 5,
			sticky: true,
			match,
			component: {
				module: "@lucidcms/plugin-seo/components",
				export: "SeoPreview",
			},
		},
		...[
			fields.title,
			fields.description,
			fields.socialTitle,
			fields.socialDescription,
			fields.xTitle,
			fields.xDescription,
		].map((field) => ({
			key: `${key}:${field}`,
			slot: fieldSlotKeys.after,
			match: { ...match, field },
			component: {
				module: "@lucidcms/plugin-seo/components",
				export: "TextGuidance",
			},
		})),
		...[fields.socialImageAlt, fields.xImageAlt].map((field) => ({
			key: `${key}:${field}`,
			slot: fieldSlotKeys.after,
			match: { ...match, field },
			component: {
				module: "@lucidcms/plugin-seo/components",
				export: "AltGuidance",
			},
		})),
		{
			key: `${key}:indexing`,
			slot: fieldSlotKeys.after,
			match: { ...match, field: fields.indexing },
			component: {
				module: "@lucidcms/plugin-seo/components",
				export: "IndexingGuidance",
			},
		},
	];
};
export default registerAdminSlots;
