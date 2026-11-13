import { defineAdminSlot } from "@lucidcms/core";
import { COMPONENTS_MODULE, PLUGIN_KEY } from "../../../constants.js";

/** Adds the IndexNow send tile to System → Operations, for users who can run it. */
const sendIndexNowConfig = () =>
	defineAdminSlot({
		key: `${PLUGIN_KEY}:index-now-send`,
		slot: "maintenance.action",
		group: "rebuild",
		permission: "settings:update",
		component: { module: COMPONENTS_MODULE, export: "SendIndexNow" },
	});

export default sendIndexNowConfig;
