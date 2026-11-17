import { definePlugin, logger } from "@lucidcms/core";
import type { LucidPluginDefinition } from "@lucidcms/core/types";
import { PACKAGE_INFO, PLUGIN_KEY } from "./constants.js";
import hookEvents from "./hook-events/index.js";
import formsRoutes from "./routes/forms.js";
import parsePluginOptions from "./services/parse-plugin-options.js";
import registerBuilder from "./services/register-builder.js";
import registerSubmissions from "./services/register-submissions.js";
import formsToolkit from "./toolkit/index.js";
import type { FormsPluginOptions } from "./types.js";

/**
 * Adds forms websites can show and send: defined in code or built by editors, checked on the
 * server, protected by a honeypot, a rate limit and the project's captcha, and followed by
 * emails, a notification and a stored submission.
 */
const plugin = (given?: FormsPluginOptions): LucidPluginDefinition => {
	const options = parsePluginOptions(given);

	return definePlugin({
		key: PLUGIN_KEY,
		package: PACKAGE_INFO,
		toolkit: formsToolkit(options),
		hookEvents,
		sources: {
			translations: ["@lucidcms/forms/translations"],
			emails: ["@lucidcms/forms/emails"],
		},
		checkCompatibility: ({ config }) => {
			//* limits count in the KV store, and the default one counts nothing
			if (options.rateLimit !== false && !config.kv?.adapter) {
				logger.warn({
					scope: PLUGIN_KEY,
					message:
						"Forms aren't rate limited without a KV adapter. Add one, or set the forms plugin's rateLimit to false if something in front of Lucid limits submissions.",
				});
			}
		},
		configure: (draft) => {
			draft.http.routes.push(...formsRoutes(options));

			if (options.builder !== false) {
				registerBuilder(draft, options, options.builder);
			}
			if (options.submissions !== false) {
				registerSubmissions(draft, options, options.submissions);
			}
		},
	});
};

export default plugin;
