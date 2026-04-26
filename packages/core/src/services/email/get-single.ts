import { resolveEmailData } from "../../libs/email/storage/index.js";
import renderMustacheTemplate from "../../libs/email/templates/render-mustache-template.js";
import { emailsFormatter } from "../../libs/formatters/index.js";
import { EmailsRepository } from "../../libs/repositories/index.js";
import T from "../../translations/index.js";
import type { Email } from "../../types/response.js";
import type { ServiceFn } from "../../utils/services/types.js";

const getSingle: ServiceFn<
	[
		{
			id: number;
			renderTemplate: boolean;
		},
	],
	Email
> = async (context, data) => {
	const Emails = new EmailsRepository(context.db.client, context.config.db);

	const emailRes = await Emails.selectSingleById({
		id: data.id,
		validation: {
			enabled: true,
			defaultError: {
				message: T("email_not_found_message"),
				status: 404,
			},
		},
	});
	if (emailRes.error) return emailRes;

	const previewDataRes = resolveEmailData({
		data: emailRes.data.data,
		storage: emailRes.data.storage_strategy,
		encryptionKey: context.config.secrets.encryption,
		mode: "preview",
	});
	if (previewDataRes.error) return previewDataRes;

	if (!data.renderTemplate) {
		return {
			error: undefined,
			data: emailsFormatter.formatSingle({
				email: emailRes.data,
				data: previewDataRes.data,
				resendWindowDays: context.config.email.resendWindowDays,
			}),
		};
	}

	const html = await renderMustacheTemplate(context, {
		template: emailRes.data.template,
		data: previewDataRes.data,
	});
	if (html.error) return html;

	return {
		error: undefined,
		data: emailsFormatter.formatSingle({
			email: emailRes.data,
			data: previewDataRes.data,
			html: html.data,
			resendWindowDays: context.config.email.resendWindowDays,
		}),
	};
};

export default getSingle;
