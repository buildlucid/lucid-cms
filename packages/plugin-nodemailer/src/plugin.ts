import T from "./translations/index.js";
import verifyTransporter from "./utils/verify-transporter.js";
import type { LucidPluginOptions } from "@lucidcms/core/types";
import type { PluginOptions } from "./types/types.js";
import { PLUGIN_KEY, LUCID_VERSION } from "./constants.js";

const plugin: LucidPluginOptions<PluginOptions> = async (
	config,
	pluginOptions,
) => {
	config.email = {
		from: pluginOptions.from,
		strategy: async (email, meta) => {
			try {
				await verifyTransporter(pluginOptions.transporter);

				await pluginOptions.transporter.sendMail({
					from: `${email.from.name} <${email.from.email}>`,
					to: email.to,
					subject: email.subject,
					cc: email.cc,
					bcc: email.bcc,
					replyTo: email.replyTo,
					text: email.text,
					html: email.html,
				});

				return {
					success: true,
					message: T("email_successfully_sent"),
				};
			} catch (error) {
				const err = error as Error;
				return {
					success: false,
					message: err.message,
				};
			}
		},
	};

	return {
		key: PLUGIN_KEY,
		lucid: LUCID_VERSION,
		config: config,
	};
};

export default plugin;
