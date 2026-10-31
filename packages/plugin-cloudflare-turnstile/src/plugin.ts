import { definePlugin } from "@lucidcms/core";
import { addContentSecurityPolicySources } from "@lucidcms/core/extension";
import type { LucidPlugin } from "@lucidcms/core/types";
import turnstileCaptchaAdapter from "./adapter.js";
import turnstileWidgetConfig from "./admin/components/TurnstileWidget/config.js";
import { LUCID_VERSION, PLUGIN_KEY, TURNSTILE_ORIGIN } from "./constants.js";
import type { PluginOptions } from "./types.js";

/** Protects Lucid's public forms with Cloudflare Turnstile. Custom forms can check tokens with `toolkit.captcha`. */
const plugin: LucidPlugin<PluginOptions> = (pluginOptions) =>
	definePlugin({
		key: PLUGIN_KEY,
		lucid: LUCID_VERSION,
		defaults: {
			captcha: { adapter: turnstileCaptchaAdapter(pluginOptions) },
		},
		configure: (draft) => {
			draft.admin.slots.push(turnstileWidgetConfig());
			addContentSecurityPolicySources(draft, {
				scriptSrc: [TURNSTILE_ORIGIN],
				frameSrc: [TURNSTILE_ORIGIN],
			});
		},
	});

export default plugin;
