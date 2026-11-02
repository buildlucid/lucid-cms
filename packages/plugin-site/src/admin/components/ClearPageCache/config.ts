import { defineAdminSlot } from "@lucidcms/core";
import {
	CLEAR_CACHE_ROUTE,
	COMPONENTS_MODULE,
	PLUGIN_KEY,
} from "../../../constants.js";

/**
 * Registers the page cache maintenance tile. Receives its route as an option to avoid importing
 * server constants.
 */
const clearPageCacheConfig = () =>
	defineAdminSlot({
		key: `${PLUGIN_KEY}:clear-cache`,
		slot: "maintenance.action",
		group: "rebuild",
		permission: "settings:update",
		component: { module: COMPONENTS_MODULE, export: "ClearPageCache" },
		options: { route: CLEAR_CACHE_ROUTE },
	});

export default clearPageCacheConfig;
