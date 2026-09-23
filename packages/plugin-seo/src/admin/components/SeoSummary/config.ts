import { brickSlotKeys } from "@lucidcms/admin/slots";
import { defineAdminSlot } from "@lucidcms/core";
import { COMPONENTS_MODULE, PLUGIN_KEY } from "../../../constants.js";

const seoSummaryConfig = (collection: string, brick: string) =>
	defineAdminSlot({
		key: `${PLUGIN_KEY}:${collection}:${brick}:summary`,
		slot: brickSlotKeys.header,
		match: { collection, brick, kind: "fixed" },
		component: { module: COMPONENTS_MODULE, export: "SeoSummary" },
	});

export default seoSummaryConfig;
