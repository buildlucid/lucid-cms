import type z from "zod";
import type { Email } from "../../../../types/response.js";
import type {
	EmailTemplateInput,
	EmailTemplateName,
} from "../../../email/types.js";
import type { inputSchema } from "./schema.js";

/** Queued email input with generated template-specific data, forming a union when `Name` is omitted; success confirms queuing, not delivery. */
export type ToolkitEmailSendInput<
	Name extends EmailTemplateName = EmailTemplateName,
> = Name extends EmailTemplateName
	? Omit<z.input<typeof inputSchema>, "template" | "data"> & {
			template: Name;
			data: EmailTemplateInput<Name>;
		}
	: never;

/** Queued job ID and the email record used to track delivery. */
export type ToolkitEmailSendResult = {
	jobId: string;
	email: Email;
};
