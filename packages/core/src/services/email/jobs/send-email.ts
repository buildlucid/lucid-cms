import T from "../../../translations/index.js";
import Repository from "../../../libs/repositories/index.js";
import renderHandlebarsTemplate from "../../../libs/email/render-handlebars-template.js";
import type { ServiceFn } from "../../../utils/services/types.js";
import type { EmailStrategyResponse } from "../../../types/config.js";
import services from "../../index.js";

const sendEmail: ServiceFn<
	[
		{
			emailId: number;
			transactionId: number;
		},
	],
	undefined
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
	});
	if (emailRes.error) return emailRes;

	const html = await renderHandlebarsTemplate(context, {
		template: emailRes.data.template,
		data: emailRes.data.data,
	});
	if (html.error) return html;

	let result: EmailStrategyResponse | undefined;
	try {
		result = await emailConfigRes.data.strategy(
			{
				to: emailRes.data.to_address,
				subject: emailRes.data.subject ?? "",
				from: emailConfigRes.data.from,
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
			delivery_status: "failed",
			message:
				error instanceof Error ? error.message : T("email_failed_to_send"),
			external_message_id: null,
		};
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
				current_status: result.delivery_status,
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
				delivery_status: result.delivery_status,
				message: result.success ? null : result.message,
				strategy_data: result.data,
				external_message_id: result.external_message_id,
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
