import T from "../../../translations/index.js";
import z from "zod";
import toolkitWrapper from "../toolkit-wrapper.js";
import lucidServices from "../../../services/index.js";
import type { ExtractServiceFnArgs } from "../../../utils/services/types.js";

const emailToolkit = {
	sendEmail: async (
		...data: ExtractServiceFnArgs<typeof lucidServices.email.sendExternal>
	) =>
		toolkitWrapper({
			fn: lucidServices.email.sendExternal,
			data: data,
			config: {
				transaction: true,
				schema: z.object({
					to: z.email(),
					subject: z.string(),
					template: z.string(),
					cc: z.string().optional(),
					bcc: z.string().optional(),
					replyTo: z.string().optional(),
					data: z.record(z.any(), z.any()),
				}),
				defaultError: {
					name: T("send_email_error_name"),
				},
			},
		}),
};

export default emailToolkit;
