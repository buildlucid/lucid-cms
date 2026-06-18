import { emailServices } from "../../../services/index.js";
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
import type { ToolkitTenantOptions } from "../types.js";
import { runToolkitService, withToolkitTenant } from "../utils.js";

export type ToolkitEmailSendInput = ToolkitTenantOptions & {
	to: string;
	subject: EmailSubject;
	template: string;
	cc?: string;
	bcc?: string;
	replyTo?: string;
	priority?: EmailPriority;
	attachments?: EmailAttachment[];
	data: Record<string, unknown>;
	storage?: EmailStorageConfig;
	from?: {
		email?: string;
		name?: string;
	};
};

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
			emailServices.sendExternal(withToolkitTenant(context, input), {
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
