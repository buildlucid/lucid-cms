import T from "../../translations/index.js";
import Repository from "../../libs/repositories/index.js";
import Formatter from "../../libs/formatters/index.js";
import renderHandlebarsTemplate from "../../libs/email/render-handlebars-template.js";
import type { ServiceFn } from "../../utils/services/types.js";
import type { EmailResponse } from "../../types/response.js";

const getSingle: ServiceFn<
	[
		{
			id: number;
			renderTemplate: boolean;
		},
	],
	EmailResponse
> = async (context, data) => {
	const Emails = Repository.get("emails", context.db, context.config.db);
	const EmailsFormatter = Formatter.get("emails");

	const emailRes = await Emails.selectSingle({
		select: [
			"id",
			"email_hash",
			"from_address",
			"from_name",
			"to_address",
			"subject",
			"cc",
			"bcc",
			"template",
			"data",
			"type",
			"created_at",
			"updated_at",
		],
		where: [
			{
				key: "id",
				operator: "=",
				value: data.id,
			},
		],
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
			data: EmailsFormatter.formatSingle({
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
		data: EmailsFormatter.formatSingle({
			email: emailRes.data,
			html: html.data,
		}),
	};
};

export default getSingle;
