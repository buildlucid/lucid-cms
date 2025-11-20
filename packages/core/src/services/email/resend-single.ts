import getEmailAdapter from "../../libs/email-adapter/get-adapter.js";
import {
	EmailsRepository,
	EmailTransactionsRepository,
} from "../../libs/repositories/index.js";
import T from "../../translations/index.js";
import type { ServiceFn } from "../../utils/services/types.js";

const resendSingle: ServiceFn<
	[
		{
			id: number;
		},
	],
	{
		jobId: string;
	}
> = async (context, data) => {
	const Emails = new EmailsRepository(context.db, context.config.db);
	const EmailTransactions = new EmailTransactionsRepository(
		context.db,
		context.config.db,
	);

	const [emailRes, emailAdapter] = await Promise.all([
		Emails.selectSingle({
			select: ["id"],
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
		}),
		getEmailAdapter(context.config),
	]);
	if (emailRes.error) return emailRes;

	const [updateEmailRes, transactionRes] = await Promise.all([
		Emails.updateSingle({
			where: [
				{
					key: "id",
					operator: "=",
					value: emailRes.data.id,
				},
			],
			data: {
				current_status: "scheduled",
				updated_at: new Date().toISOString(),
			},
		}),
		EmailTransactions.createSingle({
			data: {
				email_id: emailRes.data.id,
				delivery_status: "scheduled",
				message: null,
				strategy_identifier: emailAdapter.adapter.key,
				strategy_data: null,
				simulate: emailAdapter.simulated,
				external_message_id: null,
			},
			validation: {
				enabled: true,
			},
			returning: ["id"],
		}),
	]);
	if (transactionRes.error) return transactionRes;
	if (updateEmailRes.error) return updateEmailRes;

	const queueRes = await context.queue.command.add("email:send", {
		payload: {
			emailId: emailRes.data.id,
			transactionId: transactionRes.data.id ?? 0,
		},
		serviceContext: context,
	});
	if (queueRes.error) {
		await Promise.all([
			Emails.updateSingle({
				where: [
					{
						key: "id",
						operator: "=",
						value: emailRes.data.id,
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
						value: transactionRes.data.id,
					},
				],
				data: {
					delivery_status: "failed",
					message: queueRes.error.message,
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
		},
	};
};

export default resendSingle;
