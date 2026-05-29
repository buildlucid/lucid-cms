import { mergeTranslationBundles, text } from "@lucidcms/core/plugin";
import type { EmailAdapterInstance, LucidPlugin } from "@lucidcms/core/types";
import {
	LUCID_VERSION,
	PLUGIN_IDENTIFIER,
	PLUGIN_KEY,
	priorityHeaders,
	WEBHOOK_ENABLED,
} from "./constants.js";
import routes from "./routes/index.js";
import serverTranslations from "./translations/en.server.json" with {
	type: "json",
};
import type { PluginOptions } from "./types/types.js";
import isValidData from "./utils/is-valid-data.js";

type ResendEmailResponse = {
	id: string;
};

const plugin: LucidPlugin<PluginOptions> = (pluginOptions) => {
	const webhookEnabled = pluginOptions.webhook?.enabled ?? WEBHOOK_ENABLED;

	return {
		key: PLUGIN_KEY,
		lucid: LUCID_VERSION,
		recipe: (draft) => {
			draft.i18n.translations = mergeTranslationBundles(
				draft.i18n.translations,
				{ en: { server: serverTranslations } },
			);

			const simulate = draft.email.simulate;

			if (
				pluginOptions.webhook?.enabled &&
				draft.hono?.routes &&
				Array.isArray(draft.hono.routes)
			) {
				draft.hono.routes.push(routes(pluginOptions));
			}

			draft.email.adapter = {
				type: "email-adapter",
				key: PLUGIN_IDENTIFIER,
				send: async (email) => {
					try {
						if (simulate) {
							return {
								success: true,
								deliveryStatus: "sent",
								message: text.server("plugin.resend.email.send.success"),
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
							headers: {
								...priorityHeaders[email.priority],
								...(email.headers || {}),
							},
							attachments: email.attachments?.map((attachment) => ({
								path: attachment.url,
								filename: attachment.filename,
								...(attachment.contentType && {
									content_type: attachment.contentType,
								}),
								...(attachment.disposition === "inline" && {
									content_id: attachment.contentId,
								}),
							})),
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
								message: text.server("plugin.resend.email.send.failed"),
							};
						}

						return {
							success: true,
							deliveryStatus: webhookEnabled ? "sent" : "delivered",
							message: text.server("plugin.resend.email.send.success"),
							data: isValidData(data) ? data : null,
							externalMessageId: data.id,
						};
					} catch (error) {
						return {
							success: false,
							deliveryStatus: "failed",
							message:
								error instanceof Error
									? text.literal(error.message)
									: text.server("plugin.resend.email.send.failed"),
						};
					}
				},
			} satisfies EmailAdapterInstance;
		},
	};
};

export default plugin;
