import type { EmailAdapterInstance, LucidPlugin } from "@lucidcms/core/types";
import { LUCID_VERSION, PLUGIN_IDENTIFIER, PLUGIN_KEY } from "./constants.js";
import T from "./translations/index.js";
import type { PluginOptions } from "./types/types.js";
import isValidData from "./utils/is-valid-data.js";
import verifyTransporter from "./utils/verify-transporter.js";

const plugin: LucidPlugin<PluginOptions> = (pluginOptions) => {
	return {
		key: PLUGIN_KEY,
		lucid: LUCID_VERSION,
		recipe: (draft) => {
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
				send: async (email) => {
					try {
						if (draft.email.simulate) {
							return {
								success: true,
								deliveryStatus: "sent",
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
							deliveryStatus: "sent",
							message: T("email_successfully_sent"),
							data: isValidData(data) ? data : null,
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
			} satisfies EmailAdapterInstance;
		},
	};
};

export default plugin;
