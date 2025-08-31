import Repository from "../../libs/repositories/index.js";
import Formatter from "../../libs/formatters/index.js";
import renderHandlebarsTemplate from "../../libs/email/render-handlebars-template.js";
import type { ServiceFn } from "../../utils/services/types.js";
import type { EmailResponse } from "../../types/response.js";
import T from "../../translations/index.js";
import type { EmailStrategyResponse } from "../../types/config.js";

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
	EmailResponse
> = async (context, data) => {
	const Emails = Repository.get("emails", context.db, context.config.db);
	const EmailTransactions = Repository.get(
		"email-transactions",
		context.db,
		context.config.db,
	);
	const EmailsFormatter = Formatter.get("emails");

	const emailConfigRes =
		await context.services.email.checks.checkHasEmailConfig(context);
	if (emailConfigRes.error) return emailConfigRes;

	const html = await renderHandlebarsTemplate(context, {
		template: data.template,
		data: data.data,
	});
	if (html.error) return html;

	let result: EmailStrategyResponse;
	try {
		result = await emailConfigRes.data.strategy(
			{
				to: data.to,
				subject: data.subject,
				from: emailConfigRes.data.from,
				cc: data.cc,
				bcc: data.bcc,
				replyTo: data.replyTo,
				html: html.data,
			},
			{
				data: data.data,
				template: data.template,
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

	const newEmailRes = await Emails.createSingle({
		data: {
			from_address: emailConfigRes.data.from.email,
			from_name: emailConfigRes.data.from.name,
			to_address: data.to,
			subject: data.subject,
			template: data.template,
			cc: data.cc,
			bcc: data.bcc,
			data: data.data,
			type: data.type,
			current_status: result.delivery_status,
			attempt_count: 1,
			last_attempted_at: new Date().toISOString(),
		},
		returnAll: true,
		validation: {
			enabled: true,
			defaultError: {
				status: 500,
			},
		},
	});
	if (newEmailRes.error) return newEmailRes;

	const emailTransactionRes = await EmailTransactions.createSingle({
		data: {
			email_id: newEmailRes.data.id,
			delivery_status: result.delivery_status,
			message: result.success ? null : result.message,
			strategy_identifier: emailConfigRes.data.identifier,
			strategy_data: result.data,
			simulate: emailConfigRes.data.simulate ?? false,
			external_message_id: result.external_message_id,
		},
	});
	if (emailTransactionRes.error) return emailTransactionRes;

	return {
		error: undefined,
		data: EmailsFormatter.formatSingle({
			email: newEmailRes.data,
			html: html.data,
		}),
	};
};

export default sendEmail;
