import formatter, { emailsFormatter } from "../../libs/formatters/index.js";
import { EmailTransactionsRepository } from "../../libs/repositories/index.js";
import type { GetTransactionsQueryParams } from "../../schemas/email.js";
import type { EmailTransaction } from "../../types/response.js";
import type { ServiceFn } from "../../utils/services/types.js";

/** Returns the delivery transactions recorded for one email. */
const getTransactions: ServiceFn<
	[{ emailId: number; query: GetTransactionsQueryParams }],
	{ data: EmailTransaction[]; count: number }
> = async (context, data) => {
	const EmailTransactions = new EmailTransactionsRepository(context.db);

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
