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

	const emailExistsRes = await EmailsRepo.selectSingle({
		select: ["id", "email_hash", "sent_count", "error_count"],
		where: [
			{
				key: "email_hash",
				operator: "=",
				value: emailHash,
			},
		],
	});
	// if (emailExistsRes.error) return emailExistsRes;

	if (emailExistsRes.data) {
		const emailUpdated = await EmailsRepo.updateSingle({
			where: [
				{
					key: "id",
					operator: "=",
					value: emailExistsRes.data.id,
				},
			],
			data: {
				delivery_status: emailRecord.deliveryStatus,
				last_error_message: emailRecord.lastErrorMessage,
				last_success_at: emailRecord.lastSuccessAt,
				sent_count: emailExistsRes.data.sent_count + (result.success ? 1 : 0),
				error_count: emailExistsRes.data.error_count + (result.success ? 0 : 1),
				last_attempt_at: new Date().toISOString(),
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
			sent_count: result.success ? 1 : 0,
			error_count: result.success ? 0 : 1,
			delivery_status: emailRecord.deliveryStatus,
			last_error_message: emailRecord.lastErrorMessage,
			last_success_at: emailRecord.lastSuccessAt,
		},
		returnAll: true,
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
