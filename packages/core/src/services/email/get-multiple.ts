import Repository from "../../libs/repositories/index.js";
import Formatter from "../../libs/formatters/index.js";
import type { ServiceFn } from "../../utils/services/types.js";
import type { EmailResponse } from "../../types/response.js";
import type { GetMultipleQueryParams } from "../../schemas/email.js";

const getMultiple: ServiceFn<
	[
		{
			query: GetMultipleQueryParams;
		},
	],
	{
		data: EmailResponse[];
		count: number;
	}
> = async (context, data) => {
	const Emails = Repository.get("emails", context.db, context.config.db);
	const EmailsFormatter = Formatter.get("emails");

	const emailsRes = await Emails.selectMultipleFiltered({
		select: [
			"id",
			"email_hash",
			"from_address",
			"from_name",
			"to_address",
			"subject",
			"cc",
			"bcc",
			"delivery_status",
			"template",
			"type",
			"sent_count",
			"error_count",
			"last_error_message",
			"last_attempt_at",
			"last_success_at",
			"created_at",
		],
		queryParams: data.query,
		validation: {
			enabled: true,
		},
	});
	if (emailsRes.error) return emailsRes;

	return {
		error: undefined,
		data: {
			data: EmailsFormatter.formatMultiple({
				emails: emailsRes.data[0],
			}),
			count: Formatter.parseCount(emailsRes.data[1]?.count),
		},
	};
};

export default getMultiple;
