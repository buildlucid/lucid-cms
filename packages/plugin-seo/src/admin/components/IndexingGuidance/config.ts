import { defineAdminSlot } from "@lucidcms/core";
import { COMPONENTS_MODULE, fields, PLUGIN_KEY } from "../../../constants.js";

export type IndexingGuidanceOptions = {
	/** Whether the sitemap lists this collection's pages. */
	sitemap: boolean;
};

const indexingGuidanceConfig = (
	collection: string,
	brick: string,
	options: IndexingGuidanceOptions,
) =>
	defineAdminSlot({
		key: `${PLUGIN_KEY}:${collection}:${brick}:${fields.indexing}`,
		slot: "field.after",
		match: { collection, brick, kind: "fixed", field: fields.indexing },
		component: { module: COMPONENTS_MODULE, export: "IndexingGuidance" },
		options,
	});

export default indexingGuidanceConfig;
