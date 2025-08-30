import { genEmailHash } from "../../utils/helpers/index.js";
import Repository from "../../libs/repositories/index.js";
import Formatter from "../../libs/formatters/index.js";
import renderHandlebarsTemplate from "../../libs/email/render-handlebars-template.js";
import type { ServiceFn } from "../../utils/services/types.js";
import type { EmailResponse } from "../../types/response.js";

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

	const emailHash = genEmailHash(data);

	const result = await emailConfigRes.data.strategy(
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
			hash: emailHash,
		},
	);

	const emailRecord = {
		deliveryStatus: result.success
			? ("delivered" as const)
			: ("failed" as const),
		lastErrorMessage: result.success ? undefined : result.message,
		lastSuccessAt: result.success ? new Date().toISOString() : undefined,
	};

	const emailExistsRes = await Emails.selectSingle({
		select: ["id", "email_hash"],
		where: [
			{
				key: "email_hash",
				operator: "=",
				value: emailHash,
			},
		],
		//* not validated as we dont want to error out when the email exists
	});
	if (emailExistsRes.error) return emailExistsRes;

	if (emailExistsRes.data !== undefined) {
		const updateRes = await Emails.updateSingle({
			where: [
				{
					key: "id",
					operator: "=",
					value: emailExistsRes.data.id,
				},
			],
			data: {
				updated_at: new Date().toISOString(),
			},
			returnAll: true,
			validation: {
				enabled: true,
				defaultError: {
					status: 500,
				},
			},
		});
		if (updateRes.error) return updateRes;

		const emailTransactionRes = await EmailTransactions.createSingle({
			data: {
				email_id: emailExistsRes.data.id,
				delivery_status: emailRecord.deliveryStatus,
				message: result.success ? null : result.message,
				strategy_identifier: emailConfigRes.data.identifier,
				strategy_data: result.data,
				simulate: emailConfigRes.data.simulate ?? false,
			},
		});
		if (emailTransactionRes.error) return emailTransactionRes;

		return {
			error: undefined,
			data: EmailsFormatter.formatSingle({
				email: updateRes.data,
				html: html.data,
			}),
		};
	}

	const newEmailRes = await Emails.createSingle({
		data: {
			email_hash: emailHash,
			from_address: emailConfigRes.data.from.email,
			from_name: emailConfigRes.data.from.name,
			to_address: data.to,
			subject: data.subject,
			template: data.template,
			cc: data.cc,
			bcc: data.bcc,
			data: data.data,
			type: data.type,
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
			delivery_status: emailRecord.deliveryStatus,
			message: result.success ? null : result.message,
			strategy_identifier: emailConfigRes.data.identifier,
			strategy_data: result.data,
			simulate: emailConfigRes.data.simulate ?? false,
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
