import T from "./translations/index.js";
import {
	PLUGIN_KEY,
	LUCID_VERSION,
	WEBHOOK_ENABLED,
	PLUGIN_IDENTIFIER,
} from "./constants.js";
import isValidData from "./utils/is-valid-data.js";
import type { EmailAdapterInstance, LucidPlugin } from "@lucidcms/core/types";
import type { PluginOptions } from "./types/types.js";
import routes from "./routes/index.js";

type ResendEmailResponse = {
	id: string;
};

const plugin: LucidPlugin<PluginOptions> = (pluginOptions) => {
	const webhookEnabled = pluginOptions.webhook?.enabled ?? WEBHOOK_ENABLED;

	return {
		key: PLUGIN_KEY,
		lucid: LUCID_VERSION,
		recipe: (draft) => {
			if (
				pluginOptions.webhook?.enabled &&
				draft.hono?.extensions &&
				Array.isArray(draft.hono.extensions)
			) {
				draft.hono.extensions.push(routes(pluginOptions));
			}

			draft.email.adapter = {
				type: "email-adapter",
				key: PLUGIN_IDENTIFIER,
				services: {
					send: async (email, meta) => {
						try {
							if (draft.email.simulate) {
								return {
									success: true,
									deliveryStatus: "sent",
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
									deliveryStatus: "failed",
									message: T("email_failed_to_send"),
								};
							}

							return {
								success: true,
								deliveryStatus: webhookEnabled ? "sent" : "delivered",
								message: T("email_successfully_sent"),
								data: isValidData(data) ? data : null,
								externalMessageId: data.id,
							};
						} catch (error) {
							return {
								success: false,
								deliveryStatus: "failed",
								message:
									error instanceof Error
										? error.message
										: T("email_failed_to_send"),
							};
						}
					},
				},
			} satisfies EmailAdapterInstance;
		},
	};
};

export default plugin;
