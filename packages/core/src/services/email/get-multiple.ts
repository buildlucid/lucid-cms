import { EmailsRepository } from "../../libs/repositories/index.js";
import type { ServiceFn } from "../../utils/services/types.js";
import type { EmailResponse } from "../../types/response.js";
import type { GetMultipleQueryParams } from "../../schemas/email.js";
import formatter, { emailsFormatter } from "../../libs/formatters/index.js";

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
	const Emails = new EmailsRepository(context.db, context.config.db);

	const emailsRes = await Emails.selectMultipleFiltered({
		select: [
			"id",
			"from_address",
			"from_name",
			"to_address",
			"subject",
			"cc",
			"bcc",
			"template",
			"type",
			"current_status",
			"attempt_count",
			"last_attempted_at",
			"created_at",
			"updated_at",
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
			data: emailsFormatter.formatMultiple({
				emails: emailsRes.data[0],
			}),
			count: formatter.parseCount(emailsRes.data[1]?.count),
		},
	};
};

export default getMultiple;
