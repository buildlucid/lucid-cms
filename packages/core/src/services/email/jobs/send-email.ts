import renderHandlebarsTemplate from "../../../libs/email-adapter/templates/render-handlebars-template.js";
import {
	EmailsRepository,
	EmailTransactionsRepository,
} from "../../../libs/repositories/index.js";
import T from "../../../translations/index.js";
import type { EmailStrategyResponse } from "../../../libs/email-adapter/types.js";
import type { ServiceFn } from "../../../utils/services/types.js";
import getEmailAdapter from "../../../libs/email-adapter/get-adapter.js";

const sendEmail: ServiceFn<
	[
		{
			emailId: number;
			transactionId: number;
		},
	],
	undefined
> = async (context, data) => {
	const Emails = new EmailsRepository(context.db, context.config.db);
	const EmailTransactions = new EmailTransactionsRepository(
		context.db,
		context.config.db,
	);

	const [emailRes, emailAdapter] = await Promise.all([
		Emails.selectSingle({
			select: [
				"id",
				"from_address",
				"from_name",
				"to_address",
				"subject",
				"cc",
				"bcc",
				"template",
				"data",
				"type",
				"attempt_count",
				"created_at",
				"updated_at",
			],
			where: [
				{
					key: "id",
					operator: "=",
					value: data.emailId,
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

	const html = await renderHandlebarsTemplate(context, {
		template: emailRes.data.template,
		data: emailRes.data.data,
	});
	if (html.error) {
		await Promise.all([
			Emails.updateSingle({
				where: [{ key: "id", operator: "=", value: emailRes.data.id }],
				data: {
					current_status: "failed",
					attempt_count: (emailRes.data.attempt_count ?? 0) + 1,
					last_attempted_at: new Date().toISOString(),
					updated_at: new Date().toISOString(),
				},
			}),
			EmailTransactions.updateSingle({
				where: [{ key: "id", operator: "=", value: data.transactionId }],
				data: {
					delivery_status: "failed",
					message: html.error.message,
					updated_at: new Date().toISOString(),
				},
			}),
		]);

		return html;
	}

	let result: EmailStrategyResponse | undefined;
	if (emailAdapter.simulated) {
		result = {
			success: true,
			deliveryStatus: "sent",
			message: T("email_successfully_sent"),
			data: null,
		};
	} else {
		try {
			result = await emailAdapter.adapter.services.send(
				{
					to: emailRes.data.to_address,
					subject: emailRes.data.subject ?? "",
					from: context.config.email.from,
					html: html.data,
					cc: emailRes.data.cc ?? undefined,
					bcc: emailRes.data.bcc ?? undefined,
				},
				{
					data: emailRes.data.data,
					template: emailRes.data.template,
				},
			);
		} catch (error) {
			result = {
				success: false,
				deliveryStatus: "failed",
				message:
					error instanceof Error ? error.message : T("email_failed_to_send"),
				externalMessageId: null,
			};
		}
	}

	const [updateRes, emailTransactionRes] = await Promise.all([
		Emails.updateSingle({
			where: [
				{
					key: "id",
					operator: "=",
					value: emailRes.data.id,
				},
			],
			data: {
				current_status: result.deliveryStatus,
				attempt_count: (emailRes.data.attempt_count ?? 0) + 1,
				last_attempted_at: new Date().toISOString(),
				updated_at: new Date().toISOString(),
			},
		}),
		EmailTransactions.updateSingle({
			where: [
				{
					key: "id",
					operator: "=",
					value: data.transactionId,
				},
			],
			data: {
				delivery_status: result.deliveryStatus,
				message: result.success ? null : result.message,
				strategy_data: result.data,
				external_message_id: result.externalMessageId,
				updated_at: new Date().toISOString(),
			},
		}),
	]);

	if (updateRes.error) return updateRes;
	if (emailTransactionRes.error) return emailTransactionRes;

	return {
		error: undefined,
		data: undefined,
	};
};

export default sendEmail;
