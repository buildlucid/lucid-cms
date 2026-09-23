import { brickSlotKeys } from "@lucidcms/admin/slots";
import { defineAdminSlot } from "@lucidcms/core";
import { COMPONENTS_MODULE, PLUGIN_KEY } from "../../../constants.js";

const seoPreviewConfig = (collection: string, brick: string) =>
	defineAdminSlot({
		key: `${PLUGIN_KEY}:${collection}:${brick}:preview`,
		slot: brickSlotKeys.right,
		width: 5,
		sticky: true,
		match: { collection, brick, kind: "fixed" },
		component: { module: COMPONENTS_MODULE, export: "SeoPreview" },
	});

export default seoPreviewConfig;
