import T from "./translations/index.js";
import { PLUGIN_KEY, LUCID_VERSION } from "./constants.js";
import isValidData from "./utils/is-valid-data.js";
import type { LucidPluginOptions } from "@lucidcms/core/types";
import type { PluginOptions } from "./types/types.js";

type ResendEmailResponse = {
	id: string;
};

/**
 * @todo implement webhooks to better track delivery status
 */
const plugin: LucidPluginOptions<PluginOptions> = async (
	config,
	pluginOptions,
) => {
	config.email = {
		identifier: "resend",
		from: pluginOptions.from,
		simulate: pluginOptions.simulate,
		strategy: async (email, meta) => {
			try {
				if (pluginOptions.simulate) {
					return {
						success: true,
						message: T("email_successfully_sent"),
						data: null,
					};
				}

				const emailPayload = {
					from: `${email.from.name} <${email.from.email}>`,
					to: email.to,
					subject: email.subject,
					html: email.html,
					...(email.cc && { cc: email.cc }),
					...(email.bcc && { bcc: email.bcc }),
					...(email.replyTo && { reply_to: email.replyTo }),
					...(email.text && { text: email.text }),
				};

				const response = await fetch("https://api.resend.com/emails", {
					method: "POST",
					headers: {
						Authorization: `Bearer ${pluginOptions.apiKey}`,
						"Content-Type": "application/json",
					},
					body: JSON.stringify(emailPayload),
				});

				const data = (await response.json()) as ResendEmailResponse;

				if (!response.ok) {
					return {
						success: false,
						message: T("email_failed_to_send"),
					};
				}

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
