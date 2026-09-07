import type z from "zod";
import type { Email } from "../../../../types/response.js";
import type { inputSchema } from "./schema.js";

/** Template and recipients for a queued email. Success means the send was queued, not delivered. */
export type ToolkitEmailSendInput = z.input<typeof inputSchema>;

/** Queued job ID and the email record used to track delivery. */
export type ToolkitEmailSendResult = {
	jobId: string;
	email: Email;
};
