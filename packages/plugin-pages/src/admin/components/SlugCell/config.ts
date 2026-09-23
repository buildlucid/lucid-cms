import { defineAdminSlot } from "@lucidcms/core";
import { COMPONENTS_MODULE, PLUGIN_KEY } from "../../../constants.js";

const slugCellConfig = (collection: string) =>
	defineAdminSlot({
		key: `${PLUGIN_KEY}:${collection}:slug-column`,
		slot: "field.cell",
		match: { collection, field: "slug" },
		component: { module: COMPONENTS_MODULE, export: "SlugCell" },
	});

export default slugCellConfig;
