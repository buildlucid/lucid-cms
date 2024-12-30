import T from "../../translations/index.js";
import Repository from "../../libs/repositories/index.js";
import Formatter from "../../libs/formatters/index.js";
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
	const EmailsRepo = Repository.get("emails", context.db, context.config.db);
	const EmailsFormatter = Formatter.get("emails");

	const email = await EmailsRepo.selectSingleById({
		id: data.id,
	});

	if (email === undefined) {
		return {
			error: {
				type: "basic",
				message: T("email_not_found_message"),
				status: 404,
			},
			data: undefined,
		};
	}

	if (!data.renderTemplate) {
		return {
			error: undefined,
			data: EmailsFormatter.formatSingle({
				email: email,
			}),
		};
	}

	const html = await context.services.email.renderTemplate(context, {
		template: email.template,
		data: Formatter.parseJSON<Record<string, unknown>>(email.data),
	});
	if (html.error) return html;

	return {
		error: undefined,
		data: EmailsFormatter.formatSingle({
			email: email,
			html: html.data,
		}),
	};
};

export default getSingle;
