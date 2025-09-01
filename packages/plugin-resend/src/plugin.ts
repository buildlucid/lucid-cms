import T from "./translations/index.js";
import {
	PLUGIN_KEY,
	LUCID_VERSION,
	WEBHOOK_ENABLED,
	PLUGIN_IDENTIFIER,
} from "./constants.js";
import isValidData from "./utils/is-valid-data.js";
import type { LucidPluginOptions } from "@lucidcms/core/types";
import type { PluginOptions } from "./types/types.js";
import routes from "./routes/index.js";

type ResendEmailResponse = {
	id: string;
};

const plugin: LucidPluginOptions<PluginOptions> = async (
	config,
	pluginOptions,
) => {
	if (
		pluginOptions.webhook?.enabled &&
		config.hono.extensions &&
		Array.isArray(config.hono.extensions)
	) {
		config.hono.extensions.push(routes(pluginOptions));
	}

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

				const webhookEnabled =
					pluginOptions.webhook?.enabled ?? WEBHOOK_ENABLED;

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
						delivery_status: "failed",
						message: T("email_failed_to_send"),
					};
				}

				return {
					success: true,
					//* if the webhook is enabled, we only mark the email as sent. the status will be updated via the webhook
					delivery_status: webhookEnabled ? "sent" : "delivered",
					message: T("email_successfully_sent"),
					data: isValidData(data) ? data : null,
					external_message_id: data.id,
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
