import T from "./translations/index.js";
import verifyTransporter from "./utils/verify-transporter.js";
import isValidData from "./utils/is-valid-data.js";
import { PLUGIN_KEY, LUCID_VERSION } from "./constants.js";
import type { LucidPluginOptions } from "@lucidcms/core/types";
import type { PluginOptions } from "./types/types.js";

const plugin: LucidPluginOptions<PluginOptions> = async (
	config,
	pluginOptions,
) => {
	config.email = {
		identifier: "nodemailer",
		from: pluginOptions.from,
		strategy: async (email, meta) => {
			try {
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
					message: T("email_successfully_sent"),
					data: isValidData(data) ? data : null,
				};
			} catch (error) {
				return {
					success: false,
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
