import sendExternalEmail from "../../../services/email/send-external.js";
import type { Email } from "../../../types/response.js";
import type {
	ServiceContext,
	ServiceResponse,
} from "../../../utils/services/types.js";
import type { EmailStorageConfig } from "../../email/storage/types.js";
import type {
	EmailAttachment,
	EmailPriority,
	EmailSubject,
} from "../../email/types.js";
import { runToolkitService } from "../utils.js";

/** Template and recipients for a queued email. Success means the send was queued, not delivered. */
export type ToolkitEmailSendInput = {
	/** Recipient email address. */
	to: string;
	/** Subject text or callback receiving template data. */
	subject: EmailSubject;
	/** Registered Mustache template name. */
	template: string;
	cc?: string;
	bcc?: string;
	replyTo?: string;
	/** Delivery priority. Defaults to normal. */
	priority?: EmailPriority;
	attachments?: EmailAttachment[];
	/** Values passed to the template. */
	data: Record<string, unknown>;
	/** Rules for retaining and displaying template data in email history. */
	storage?: EmailStorageConfig;
	/** Sender overrides. Omitted values use config.email.from. */
	from?: {
		email?: string;
		name?: string;
	};
};

/** Queued job ID and the email record used to track delivery. */
export type ToolkitEmailSendResult = {
	jobId: string;
	email: Email;
};

const send = async (
	context: ServiceContext,
	input: ToolkitEmailSendInput,
): ServiceResponse<ToolkitEmailSendResult> => {
	return runToolkitService(
		() =>
			sendExternalEmail(context, {
				to: input.to,
				subject: input.subject,
				template: input.template,
				cc: input.cc,
				bcc: input.bcc,
				replyTo: input.replyTo,
				priority: input.priority,
				attachments: input.attachments,
				data: input.data,
				storage: input.storage,
				from: input.from,
			}),
		{
			name: {
				key: "core.toolkit.email.send.error.name",
				defaultMessage: "Email Toolkit Error",
			},
			message: {
				key: "core.toolkit.email.send.error.message",
				defaultMessage: "Lucid toolkit could not send the email.",
			},
		},
	);
};

export default send;
