import { defineAdminSlot } from "@lucidcms/core";
import { COMPONENTS_MODULE, fields, PLUGIN_KEY } from "../../../constants.js";

const indexingGuidanceConfig = (collection: string, brick: string) =>
	defineAdminSlot({
		key: `${PLUGIN_KEY}:${collection}:${brick}:${fields.indexing}`,
		slot: "field.after",
		match: { collection, brick, kind: "fixed", field: fields.indexing },
		component: { module: COMPONENTS_MODULE, export: "IndexingGuidance" },
	});

export default indexingGuidanceConfig;
