import { emailServices } from "../../../services/index.js";
import type { Email } from "../../../types/response.js";
import type {
	ServiceContext,
	ServiceResponse,
} from "../../../utils/services/types.js";
import type { EmailStorageConfig } from "../../email/storage/types.js";
import { runToolkitService } from "../utils.js";

export type ToolkitEmailSendInput = {
	to: string;
	subject: string;
	template: string;
	cc?: string;
	bcc?: string;
	replyTo?: string;
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
): ServiceResponse<ToolkitEmailSendResult> =>
	runToolkitService(
		() => emailServices.sendExternal(context, input),
		"Lucid toolkit could not send the email.",
	);

export default send;
