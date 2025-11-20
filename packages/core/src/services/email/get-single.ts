import renderHandlebarsTemplate from "../../libs/email-adapter/templates/render-handlebars-template.js";
import { emailsFormatter } from "../../libs/formatters/index.js";
import { EmailsRepository } from "../../libs/repositories/index.js";
import T from "../../translations/index.js";
import type { EmailResponse } from "../../types/response.js";
import type { ServiceFn } from "../../utils/services/types.js";

const getSingle: ServiceFn<
	[
		{
			id: number;
			renderTemplate: boolean;
		},
	],
	EmailResponse
> = async (context, data) => {
	const Emails = new EmailsRepository(context.db, context.config.db);

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

	if (!data.renderTemplate) {
		return {
			error: undefined,
			data: emailsFormatter.formatSingle({
				email: emailRes.data,
			}),
		};
	}

	const html = await renderHandlebarsTemplate(context, {
		template: emailRes.data.template,
		data: emailRes.data.data,
	});
	if (html.error) return html;

	return {
		error: undefined,
		data: emailsFormatter.formatSingle({
			email: emailRes.data,
			html: html.data,
		}),
	};
};

export default getSingle;
