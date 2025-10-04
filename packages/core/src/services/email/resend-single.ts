import T from "../../translations/index.js";
import Repository from "../../libs/repositories/index.js";
import type { ServiceFn } from "../../utils/services/types.js";
import services from "../index.js";

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
	const emailConfigRes =
		await services.email.checks.checkHasEmailConfig(context);
	if (emailConfigRes.error) return emailConfigRes;

	const Emails = Repository.get("emails", context.db, context.config.db);
	const EmailTransactions = Repository.get(
		"email-transactions",
		context.db,
		context.config.db,
	);

	const emailRes = await Emails.selectSingle({
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
	});
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
				strategy_identifier: emailConfigRes.data.identifier,
				strategy_data: null,
				simulate: emailConfigRes.data.simulate ?? false,
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

	const queueRes = await context.queue.add("email:send", {
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
