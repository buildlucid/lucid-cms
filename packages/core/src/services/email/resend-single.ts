import T from "../../translations/index.js";
import Repository from "../../libs/repositories/index.js";
import type { ServiceFn } from "../../utils/services/types.js";

const resendSingle: ServiceFn<
	[
		{
			id: number;
		},
	],
	{
		success: boolean;
		message: string;
	}
> = async (context, data) => {
	const emailConfigRes =
		await context.services.email.checks.checkHasEmailConfig(context);
	if (emailConfigRes.error) return emailConfigRes;

	const EmailsRepo = Repository.get("emails", context.db, context.config.db);

	const email = await EmailsRepo.selectSingle({
		select: [
			"id",
			"email_hash",
			"from_address",
			"from_name",
			"to_address",
			"subject",
			"cc",
			"bcc",
			"delivery_status",
			"template",
			"data",
			"type",
			"sent_count",
			"error_count",
			"last_error_message",
			"last_attempt_at",
			"last_success_at",
			"created_at",
		],
		where: [
			{
				key: "id",
				operator: "=",
				value: data.id,
			},
		],
	});

	if (email === undefined) {
		return {
			error: {
				type: "basic",
				message: T("email_not_found_message"),
				status: 404,
			},
			data: undefined,
		};
	}

	const templateData = (email.data ?? {}) as Record<string, unknown>;

	const html = await context.services.email.renderTemplate(context, {
		template: email.template,
		data: templateData,
	});
	if (html.error) return html;

	const result = await emailConfigRes.data.strategy(
		{
			to: email.to_address,
			subject: email.subject ?? "",
			from: {
				name: email.from_name,
				email: email.from_address,
			},
			html: html.data,
			cc: email.cc ?? undefined,
			bcc: email.bcc ?? undefined,
		},
		{
			data: templateData,
			template: email.template,
			hash: email.email_hash,
		},
	);

	await EmailsRepo.updateSingle({
		where: [
			{
				key: "id",
				operator: "=",
				value: email.id,
			},
		],
		data: {
			delivery_status: result.success ? "delivered" : "failed",
			last_error_message: result.success ? undefined : result.message,
			last_success_at: result.success ? new Date().toISOString() : undefined,
			sent_count: email.sent_count + (result.success ? 1 : 0),
			error_count: email.error_count + (result.success ? 0 : 1),
			last_attempt_at: new Date().toISOString(),
		},
	});

	return {
		error: undefined,
		data: {
			success: result.success,
			message: result.message,
		},
	};
};

export default resendSingle;
