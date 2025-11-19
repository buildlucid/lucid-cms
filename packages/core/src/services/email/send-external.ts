import serviceWrapper from "../../utils/services/service-wrapper.js";
import type { ServiceFn } from "../../utils/services/types.js";
import type { EmailResponse } from "../../types/response.js";
import { emailServices } from "../index.js";

const sendExternal: ServiceFn<
	[
		{
			to: string;
			subject: string;
			template: string;
			cc?: string;
			bcc?: string;
			replyTo?: string;
			data: {
				[key: string]: unknown;
			};
		},
	],
	{
		jobId: string;
		email: EmailResponse;
	}
> = async (context, data) =>
	serviceWrapper(emailServices.sendEmail, {
		transaction: true,
	})(context, {
		type: "external",
		to: data.to,
		subject: data.subject,
		template: data.template,
		cc: data.cc,
		bcc: data.bcc,
		replyTo: data.replyTo,
		data: data.data,
	});

export default sendExternal;
