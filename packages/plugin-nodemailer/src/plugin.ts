import T from "./translations/index.js";
import verifyTransporter from "./utils/verify-transporter.js";
import isValidData from "./utils/is-valid-data.js";
import { PLUGIN_KEY, LUCID_VERSION, PLUGIN_IDENTIFIER } from "./constants.js";
import type { LucidPluginOptions } from "@lucidcms/core/types";
import type { PluginOptions } from "./types/types.js";

const plugin: LucidPluginOptions<PluginOptions> = async (
	config,
	pluginOptions,
) => {
	config.email = {
		identifier: PLUGIN_IDENTIFIER,
		from: pluginOptions.from,
		simulate: pluginOptions.simulate,
		strategy: async (email, meta) => {
			try {
				if (pluginOptions.simulate) {
					return {
						success: true,
						delivery_status: "sent",
						message: T("email_successfully_sent"),
						data: null,
					};
				}

				await verifyTransporter(pluginOptions.transporter);

				const data = await pluginOptions.transporter.sendMail({
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
					delivery_status: "sent",
					message: T("email_successfully_sent"),
					data: isValidData(data) ? data : null,
				};
			} catch (error) {
				return {
					success: false,
					delivery_status: "failed",
					message:
						error instanceof Error ? error.message : T("email_failed_to_send"),
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
