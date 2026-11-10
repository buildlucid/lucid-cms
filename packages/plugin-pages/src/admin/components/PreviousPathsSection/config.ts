import { defineAdminSlot } from "@lucidcms/core";
import { COMPONENTS_MODULE, PLUGIN_KEY } from "../../../constants.js";

/** Lists a page's previous paths in the document sidebar, above its details. */
const previousPathsSectionConfig = (collection: string) =>
	defineAdminSlot({
		key: `${PLUGIN_KEY}:${collection}:previous-paths`,
		slot: "document.sidebar",
		match: { collection },
		position: { before: "details" },
		component: { module: COMPONENTS_MODULE, export: "PreviousPathsSection" },
	});

export default previousPathsSectionConfig;
