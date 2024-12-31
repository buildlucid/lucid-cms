import { genEmailHash } from "../../utils/helpers/index.js";
import Repository from "../../libs/repositories/index.js";
import Formatter from "../../libs/formatters/index.js";
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
	const EmailsRepo = Repository.get("emails", context.db, context.config.db);
	const EmailsFormatter = Formatter.get("emails");

	const emailConfigRes =
		await context.services.email.checks.checkHasEmailConfig(context);
	if (emailConfigRes.error) return emailConfigRes;

	const html = await context.services.email.renderTemplate(context, {
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
			? "delivered"
			: ("failed" as "delivered" | "failed"),
		lastErrorMessage: result.success ? undefined : result.message,
		lastSuccessAt: result.success ? new Date().toISOString() : undefined,
	};

	const emailExists = await EmailsRepo.selectSingle({
		select: ["id", "email_hash", "sent_count", "error_count"],
		where: [
			{
				key: "email_hash",
				operator: "=",
				value: emailHash,
			},
		],
	});

	if (emailExists) {
		const emailUpdated = await EmailsRepo.updateSingle({
			where: [
				{
					key: "id",
					operator: "=",
					value: emailExists.id,
				},
			],
			data: {
				deliveryStatus: emailRecord.deliveryStatus,
				lastErrorMessage: emailRecord.lastErrorMessage,
				lastSuccessAt: emailRecord.lastSuccessAt,
				sentCount: emailExists.sent_count + (result.success ? 1 : 0),
				errorCount: emailExists.error_count + (result.success ? 0 : 1),
				lastAttemptAt: new Date().toISOString(),
			},
		});

		if (emailUpdated === undefined) {
			return {
				error: {
					type: "basic",
					status: 500,
				},
				data: undefined,
			};
		}

		return {
			error: undefined,
			data: EmailsFormatter.formatSingle({
				email: emailUpdated,
				html: html.data,
			}),
		};
	}
	const newEmail = await EmailsRepo.createSingle({
		emailHash: emailHash,
		fromAddress: emailConfigRes.data.from.email,
		fromName: emailConfigRes.data.from.name,
		toAddress: data.to,
		subject: data.subject,
		template: data.template,
		cc: data.cc,
		bcc: data.bcc,
		data: data.data,
		type: data.type,
		sentCount: result.success ? 1 : 0,
		errorCount: result.success ? 0 : 1,
		deliveryStatus: emailRecord.deliveryStatus,
		lastErrorMessage: emailRecord.lastErrorMessage,
		lastSuccessAt: emailRecord.lastSuccessAt,
	});

	if (newEmail === undefined) {
		return {
			error: {
				type: "basic",
				status: 500,
			},
			data: undefined,
		};
	}

	return {
		error: undefined,
		data: EmailsFormatter.formatSingle({
			email: newEmail,
			html: html.data,
		}),
	};
};

export default sendEmail;
