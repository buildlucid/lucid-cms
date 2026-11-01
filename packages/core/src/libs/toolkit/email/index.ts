import type { Email } from "../../../types/response.js";
import type {
	ServiceContext,
	ServiceResponse,
} from "../../../utils/services/types.js";
import type { EmailTemplateName } from "../../email/types.js";
import getMultiple, {
	type ToolkitEmailGetMultipleInput,
	type ToolkitEmailGetMultipleResult,
} from "./get-multiple/index.js";
import getSingle, {
	type ToolkitEmailGetSingleInput,
} from "./get-single/index.js";
import type {
	ToolkitEmailSendInput,
	ToolkitEmailSendResult,
} from "./send/index.js";
import send from "./send/index.js";

/** Sends external emails, and reads emails as the system or as a user with `email:read`, who only sees what the admin would show them. */
export type ToolkitEmail = {
	/** Queues an external email send. */
	send: <Name extends EmailTemplateName>(
		input: ToolkitEmailSendInput<Name>,
	) => ServiceResponse<ToolkitEmailSendResult>;
	/**
	 * Lists emails a page at a time as `items` with its `pagination`, without their data, attachments or HTML.
	 *
	 * @example
	 * ```ts
	 * await toolkit.email.getMultiple({
	 *   query: {
	 *     filter: {
	 *       currentStatus: { value: ["failed", "bounced"], operator: "in" },
	 *     },
	 *   },
	 * });
	 * ```
	 */
	getMultiple: (
		input?: ToolkitEmailGetMultipleInput,
	) => ServiceResponse<ToolkitEmailGetMultipleResult>;
	/** Returns an email by ID, such as one referenced by an email field, with its delivery status. */
	getSingle: (input: ToolkitEmailGetSingleInput) => ServiceResponse<Email>;
};

/** Creates email helpers for a toolkit instance. */
export const createEmailToolkit = (context: ServiceContext): ToolkitEmail => ({
	send: (input) => send(context, input),
	getMultiple: (input) => getMultiple(context, input),
	getSingle: (input) => getSingle(context, input),
});

export default createEmailToolkit;
