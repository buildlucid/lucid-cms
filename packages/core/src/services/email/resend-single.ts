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

	const email = await EmailsRepo.selectSingleById({
		id: data.id,
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
			deliveryStatus: result.success ? "delivered" : "failed",
			lastErrorMessage: result.success ? undefined : result.message,
			lastSuccessAt: result.success ? new Date().toISOString() : undefined,
			sentCount: email.sent_count + (result.success ? 1 : 0),
			errorCount: email.error_count + (result.success ? 0 : 1),
			lastAttemptAt: new Date().toISOString(),
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
