import { definePlugin } from "@lucidcms/core";
import { addContentSecurityPolicySources } from "@lucidcms/core/extension";
import type { LucidPlugin } from "@lucidcms/core/types";
import recaptchaCaptchaAdapter from "./adapter.js";
import recaptchaWidgetConfig from "./admin/components/RecaptchaWidget/config.js";
import { CSP_SOURCES, LUCID_VERSION, PLUGIN_KEY } from "./constants.js";
import type { PluginOptions } from "./types.js";

/** Protects Lucid's public forms with Google reCAPTCHA. Custom forms can check tokens with `toolkit.captcha`. */
const plugin: LucidPlugin<PluginOptions> = (pluginOptions) =>
	definePlugin({
		key: PLUGIN_KEY,
		lucid: LUCID_VERSION,
		defaults: {
			captcha: { adapter: recaptchaCaptchaAdapter(pluginOptions) },
		},
		configure: (draft) => {
			draft.admin.slots.push(recaptchaWidgetConfig());
			addContentSecurityPolicySources(draft, CSP_SOURCES);
		},
	});

export default plugin;
