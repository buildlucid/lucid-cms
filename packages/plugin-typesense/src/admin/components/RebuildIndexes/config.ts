import { defineAdminSlot } from "@lucidcms/core";
import { COMPONENTS_MODULE, PLUGIN_KEY } from "../../../constants.js";

/** Adds the index rebuild tile to System → Operations, for users who can run it. */
const rebuildIndexesConfig = () =>
	defineAdminSlot({
		key: `${PLUGIN_KEY}:rebuild`,
		slot: "maintenance.action",
		group: "rebuild",
		permission: "settings:update",
		component: { module: COMPONENTS_MODULE, export: "RebuildIndexes" },
	});

export default rebuildIndexesConfig;
