import { defineAdminSlot } from "@lucidcms/core";
import {
	COMPONENTS_MODULE,
	PLUGIN_IDENTIFIER,
	PLUGIN_KEY,
} from "../../../constants.js";

const turnstileWidgetConfig = () =>
	defineAdminSlot({
		key: `${PLUGIN_KEY}:widget`,
		slot: "captcha.widget",
		match: { adapter: PLUGIN_IDENTIFIER },
		component: { module: COMPONENTS_MODULE, export: "TurnstileWidget" },
	});

export default turnstileWidgetConfig;
