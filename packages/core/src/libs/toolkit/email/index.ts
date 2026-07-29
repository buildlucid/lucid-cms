import type {
	ServiceContext,
	ServiceResponse,
} from "../../../utils/services/types.js";
import type { ToolkitEmailSendInput, ToolkitEmailSendResult } from "./send.js";
import send from "./send.js";

export type ToolkitEmail = {
	/** Queues an external email send. */
	send: (
		input: ToolkitEmailSendInput,
	) => ServiceResponse<ToolkitEmailSendResult>;
};

/** Creates email helpers for a toolkit instance. */
export const createEmailToolkit = (context: ServiceContext): ToolkitEmail => ({
	send: (input) => send(context, input),
});

export default createEmailToolkit;
