import { defineAdminSlot } from "@lucidcms/core";
import { COMPONENTS_MODULE, PLUGIN_KEY } from "../../../constants.js";

/** Presents computed paths alongside the slug instead of as a separate field. */
const fullSlugConfig = (collection: string) =>
	defineAdminSlot({
		key: `${PLUGIN_KEY}:${collection}:path`,
		slot: "field.after",
		match: { collection, kind: "collection-fields", field: "slug" },
		component: { module: COMPONENTS_MODULE, export: "FullSlug" },
	});

export default fullSlugConfig;
