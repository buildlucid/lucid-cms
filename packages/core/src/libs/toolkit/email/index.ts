import type {
	ServiceContext,
	ServiceResponse,
} from "../../../utils/services/types.js";
import type { EmailTemplateName } from "../../email/types.js";
import type {
	ToolkitEmailSendInput,
	ToolkitEmailSendResult,
} from "./send/index.js";
import send from "./send/index.js";

export type ToolkitEmail = {
	/** Queues an external email send. */
	send: <Name extends EmailTemplateName>(
		input: ToolkitEmailSendInput<Name>,
	) => ServiceResponse<ToolkitEmailSendResult>;
};

/** Creates email helpers for a toolkit instance. */
export const createEmailToolkit = (context: ServiceContext): ToolkitEmail => ({
	send: (input) => send(context, input),
});

export default createEmailToolkit;
