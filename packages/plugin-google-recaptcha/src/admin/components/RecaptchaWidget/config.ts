import { defineAdminSlot } from "@lucidcms/core";
import {
	COMPONENTS_MODULE,
	PLUGIN_IDENTIFIER,
	PLUGIN_KEY,
} from "../../../constants.js";

const recaptchaWidgetConfig = () =>
	defineAdminSlot({
		key: `${PLUGIN_KEY}:widget`,
		slot: "captcha.widget",
		match: { adapter: PLUGIN_IDENTIFIER },
		component: { module: COMPONENTS_MODULE, export: "RecaptchaWidget" },
	});

export default recaptchaWidgetConfig;
