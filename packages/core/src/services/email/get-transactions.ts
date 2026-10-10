import formatter, { emailsFormatter } from "../../libs/formatters/index.js";
import { copy } from "../../libs/i18n/index.js";
import {
	EmailsRepository,
	EmailTransactionsRepository,
} from "../../libs/repositories/index.js";
import type { GetTransactionsQueryParams } from "../../schemas/email.js";
import type { LucidActor } from "../../types/hono.js";
import type { EmailTransaction } from "../../types/response.js";
import type { ServiceFn } from "../../utils/services/types.js";

/** Returns the delivery transactions recorded for one email the actor can see. */
const getTransactions: ServiceFn<
	[
		{
			emailId: number;
			query: GetTransactionsQueryParams;
			authUser: LucidActor;
		},
	],
	{ data: EmailTransaction[]; count: number }
> = async (context, data) => {
	const Emails = new EmailsRepository(context.db);
	const EmailTransactions = new EmailTransactionsRepository(context.db);

	const emailRes = await Emails.selectSingleById({
		id: data.emailId,
		includeSystem: data.authUser.superAdmin,
		validation: {
			enabled: true,
			defaultError: {
				message: copy("server:core.email.not.found.message"),
				status: 404,
			},
		},
	});
	if (emailRes.error) return emailRes;

	const transactions = await EmailTransactions.selectMultipleFiltered({
		select: [
			"id",
			"email_id",
			"delivery_status",
			"message",
			"strategy_identifier",
			"strategy_data",
			"external_message_id",
			"simulate",
			"created_at",
			"updated_at",
		],
		where: [{ key: "email_id", operator: "=", value: data.emailId }],
		queryParams: data.query,
		validation: { enabled: true },
	});
	if (transactions.error) return transactions;

	return {
		error: undefined,
		data: {
			data: emailsFormatter.formatTransactions(transactions.data[0]),
			count: formatter.parseCount(transactions.data[1]?.count),
		},
	};
};

export default getTransactions;
