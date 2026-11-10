import { defineAdminSlot } from "@lucidcms/core";
import { COMPONENTS_MODULE, PLUGIN_KEY } from "../../../constants.js";

/** Adds the path history clearing tile to System → Operations, for users who can run it. */
const clearPathHistoryConfig = () =>
	defineAdminSlot({
		key: `${PLUGIN_KEY}:clear-path-history`,
		slot: "maintenance.action",
		group: "remove",
		permission: "settings:update",
		component: { module: COMPONENTS_MODULE, export: "ClearPathHistory" },
	});

export default clearPathHistoryConfig;
