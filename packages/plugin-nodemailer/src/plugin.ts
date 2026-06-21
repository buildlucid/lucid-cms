import { copy } from "@lucidcms/core/plugin";
import type { EmailAdapterInstance, LucidPlugin } from "@lucidcms/core/types";
import {
	LUCID_VERSION,
	PLUGIN_IDENTIFIER,
	PLUGIN_KEY,
	priorityHeaders,
} from "./constants.js";
import type { PluginOptions } from "./types/types.js";
import isValidData from "./utils/is-valid-data.js";
import { resolveNodemailerAttachments } from "./utils/remote-attachments.js";
import verifyTransporter from "./utils/verify-transporter.js";

const plugin: LucidPlugin<PluginOptions> = (pluginOptions) => {
	return {
		key: PLUGIN_KEY,
		lucid: LUCID_VERSION,
		recipe: (draft) => {
			draft.i18n.sources.push("@lucidcms/plugin-nodemailer/translations");

			const simulate = draft.email.simulate;

			draft.email.adapter = {
				type: "email-adapter",
				key: PLUGIN_IDENTIFIER,
				lifecycle: {
					init: async () => {
						await verifyTransporter(pluginOptions.transporter);
					},
					destroy: async () => {
						pluginOptions.transporter.close();
					},
				},
				send: async (_context, email) => {
					try {
						if (simulate) {
							return {
								success: true,
								deliveryStatus: "sent",
								message: copy("server:plugin.nodemailer.email.send.success"),
								data: null,
							};
						}
						await verifyTransporter(pluginOptions.transporter);

						const attachmentsRes = await resolveNodemailerAttachments(
							email.attachments,
							pluginOptions.remoteAttachments,
						);
						if (attachmentsRes.error) {
							return {
								success: false,
								deliveryStatus: "failed",
								message:
									attachmentsRes.error.message ??
									copy("server:plugin.nodemailer.email.send.failed"),
							};
						}

						const data = await pluginOptions.transporter.sendMail({
							from: `${email.from.name} <${email.from.email}>`,
							to: email.to,
							subject: email.subject,
							cc: email.cc,
							bcc: email.bcc,
							replyTo: email.replyTo,
							priority: email.priority,
							headers: {
								...priorityHeaders[email.priority],
								...(email.headers || {}),
							},
							attachments: attachmentsRes.data,
							text: email.text,
							html: email.html,
						});
						return {
							success: true,
							deliveryStatus: "sent",
							message: copy("server:plugin.nodemailer.email.send.success"),
							data: isValidData(data) ? data : null,
						};
					} catch (error) {
						return {
							success: false,
							deliveryStatus: "failed",
							message:
								error instanceof Error
									? copy.literal(error.message)
									: copy("server:plugin.nodemailer.email.send.failed"),
						};
					}
				},
			} satisfies EmailAdapterInstance;
		},
	};
};

export default plugin;
