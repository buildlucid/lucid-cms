import { defineAdminSlot } from "@lucidcms/core";
import { COMPONENTS_MODULE, PLUGIN_KEY } from "../../../constants.js";

/** Adds the page path rebuild tile to System → Operations, for users who can run it. */
const rebuildPathsConfig = () =>
	defineAdminSlot({
		key: `${PLUGIN_KEY}:rebuild-paths`,
		slot: "maintenance.action",
		group: "rebuild",
		permission: "settings:update",
		component: { module: COMPONENTS_MODULE, export: "RebuildPaths" },
	});

export default rebuildPathsConfig;
