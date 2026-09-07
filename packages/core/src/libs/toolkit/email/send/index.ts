import type {
	ServiceContext,
	ServiceResponse,
} from "../../../../utils/services/types.js";
import { runToolkitService } from "../../utils.js";
import { inputSchema } from "./schema.js";
import type { ToolkitEmailSendInput, ToolkitEmailSendResult } from "./types.js";

export type * from "./types.js";

const send = async (
	context: ServiceContext,
	input: ToolkitEmailSendInput,
): ServiceResponse<ToolkitEmailSendResult> => {
	return runToolkitService({
		schema: inputSchema,
		input,
		handler: async (data) => {
			const { default: sendExternalEmail } = await import(
				"../../../../services/email/send-external.js"
			);

			return sendExternalEmail(context, {
				to: data.to,
				subject: data.subject,
				template: data.template,
				cc: data.cc,
				bcc: data.bcc,
				replyTo: data.replyTo,
				priority: data.priority,
				attachments: data.attachments,
				data: data.data,
				storage: data.storage,
				from: data.from,
			});
		},
		name: {
			key: "core.toolkit.email.send.error.name",
			defaultMessage: "Email Toolkit Error",
		},
		message: {
			key: "core.toolkit.email.send.error.message",
			defaultMessage: "Lucid toolkit could not send the email.",
		},
	});
};

export default send;
