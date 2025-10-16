import getEmailAdapter from "../../libs/email-adapter/get-adapter.js";
import Formatter from "../../libs/formatters/index.js";
import Repository from "../../libs/repositories/index.js";
import type { EmailResponse } from "../../types/response.js";
import type { ServiceFn } from "../../utils/services/types.js";
import services from "../index.js";

const sendEmail: ServiceFn<
	[
		{
			type: "internal" | "external";
			to: string;
			subject: string;
			template: string;
			cc?: string;
			bcc?: string;
			replyTo?: string;
			data: Record<string, unknown>;
		},
	],
	{
		jobId: string;
		email: EmailResponse;
	}
> = async (context, data) => {
	const Emails = Repository.get("emails", context.db, context.config.db);
	const EmailTransactions = Repository.get(
		"email-transactions",
		context.db,
		context.config.db,
	);
	const EmailsFormatter = Formatter.get("emails");

	const [newEmailRes, emailAdapter] = await Promise.all([
		Emails.createSingle({
			data: {
				from_address: context.config.email.from.email,
				from_name: context.config.email.from.name,
				to_address: data.to,
				subject: data.subject,
				template: data.template,
				cc: data.cc,
				bcc: data.bcc,
				data: data.data,
				type: data.type,
				current_status: "scheduled",
				attempt_count: 0,
				last_attempted_at: undefined,
			},
			returnAll: true,
			validation: {
				enabled: true,
				defaultError: {
					status: 500,
				},
			},
		}),
		getEmailAdapter(context.config),
	]);
	if (newEmailRes.error) return newEmailRes;

	const initialTransactionRes = await EmailTransactions.createSingle({
		data: {
			email_id: newEmailRes.data.id,
			delivery_status: "scheduled",
			message: null,
			strategy_identifier: emailAdapter.adapter.key,
			strategy_data: null,
			simulate: emailAdapter.simulated,
			external_message_id: null,
		},
		returnAll: true,
	});
	if (initialTransactionRes.error) return initialTransactionRes;

	const queueRes = await context.queue.command.add("email:send", {
		payload: {
			emailId: newEmailRes.data.id,
			transactionId: initialTransactionRes.data?.id ?? 0,
		},
		serviceContext: context,
	});
	if (queueRes.error) {
		//* if queueing fails, update email and transaction to failed
		await Promise.all([
			Emails.updateSingle({
				where: [
					{
						key: "id",
						operator: "=",
						value: newEmailRes.data.id,
					},
				],
				data: {
					current_status: "failed",
					updated_at: new Date().toISOString(),
				},
			}),
			EmailTransactions.updateSingle({
				where: [
					{
						key: "id",
						operator: "=",
						value: initialTransactionRes.data?.id ?? 0,
					},
				],
				data: {
					delivery_status: "failed",
					message: queueRes.error.message || "Failed to queue email",
					updated_at: new Date().toISOString(),
				},
			}),
		]);
		return queueRes;
	}

	return {
		error: undefined,
		data: {
			jobId: queueRes.data.jobId,
			email: EmailsFormatter.formatSingle({
				email: newEmailRes.data,
				html: undefined,
			}),
		},
	};
};

export default sendEmail;
