import T from "../../translations/index.js";
import Repository from "../../libs/repositories/index.js";
import renderHandlebarsTemplate from "../../libs/email/render-handlebars-template.js";
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

	const Emails = Repository.get("emails", context.db, context.config.db);

	const emailRes = await Emails.selectSingle({
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
			"strategy_identifier",
			"strategy_data",
			"type",
			"sent_count",
			"error_count",
			"last_error_message",
			"last_attempt_at",
			"last_success_at",
			"simulate",
			"created_at",
		],
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

	const templateData = (emailRes.data.data ?? {}) as Record<string, unknown>;

	const html = await renderHandlebarsTemplate(context, {
		template: emailRes.data.template,
		data: templateData,
	});
	if (html.error) return html;

	const result = await emailConfigRes.data.strategy(
		{
			to: emailRes.data.to_address,
			subject: emailRes.data.subject ?? "",
			// from: {
			// 	name: emailRes.data.from_name,
			// 	email: emailRes.data.from_address,
			// },
			//* send with the current from config
			from: emailConfigRes.data.from,
			html: html.data,
			cc: emailRes.data.cc ?? undefined,
			bcc: emailRes.data.bcc ?? undefined,
		},
		{
			data: templateData,
			template: emailRes.data.template,
			hash: emailRes.data.email_hash,
		},
	);

	const updateRes = await Emails.updateSingle({
		where: [
			{
				key: "id",
				operator: "=",
				value: emailRes.data.id,
			},
		],
		data: {
			delivery_status: result.success ? "delivered" : "failed",
			last_error_message: result.success ? undefined : result.message,
			last_success_at: result.success ? new Date().toISOString() : undefined,
			sent_count: emailRes.data.sent_count + (result.success ? 1 : 0),
			error_count: emailRes.data.error_count + (result.success ? 0 : 1),
			last_attempt_at: new Date().toISOString(),
			strategy_identifier: emailConfigRes.data.identifier,
			strategy_data: result.data,
			simulate: emailConfigRes.data.simulate ?? false,
		},
	});
	if (updateRes.error) return updateRes;

	return {
		error: undefined,
		data: {
			success: result.success,
			message: result.message,
		},
	};
};

export default resendSingle;
