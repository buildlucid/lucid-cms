import constants from "../../../constants/constants.js";
import type { BuiltInEmailTemplates } from "../../../libs/email/types.js";
import { formatEmailSubject } from "../../../utils/helpers/index.js";
import type { ServiceFn } from "../../../utils/services/types.js";
import sendEmail from "../send-email.js";

/** Sends a test email and returns its record for checking delivery after the job runs. */
const sendTestEmail: ServiceFn<[{ to: string }], { emailId: number }> = async (
	context,
	data,
) => {
	const sent = await sendEmail(context, {
		template: constants.email.templates.test.key,
		type: "internal",
		to: data.to,
		isSystem: true,
		subject: (emailData) =>
			formatEmailSubject(
				context.translate("server:core.email.test.subject"),
				emailData.context.brand.name,
			),
		data: {
			adapter: context.email.key,
		} satisfies BuiltInEmailTemplates["test"],
	});
	if (sent.error) return sent;

	return { error: undefined, data: { emailId: sent.data.email.id } };
};

export default sendTestEmail;
