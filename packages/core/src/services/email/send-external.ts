import constants from "../../constants/constants.js";
import type { EmailStorageConfig } from "../../libs/email/storage/types.js";
import type {
	EmailAttachment,
	EmailPriority,
	EmailSubject,
} from "../../libs/email/types.js";
import { copy } from "../../libs/i18n/index.js";
import type { Email } from "../../types/response.js";
import serviceWrapper from "../../utils/services/service-wrapper.js";
import type { ServiceFn } from "../../utils/services/types.js";
import { emailServices } from "../index.js";

const sendExternal: ServiceFn<
	[
		{
			to: string;
			subject: EmailSubject;
			template: string;
			cc?: string;
			bcc?: string;
			replyTo?: string;
			priority?: EmailPriority;
			attachments?: EmailAttachment[];
			data: {
				[key: string]: unknown;
			};
			storage?: EmailStorageConfig;
			tenantKey?: string | null;
			from?: {
				email?: string;
				name?: string;
			};
		},
	],
	{
		jobId: string;
		email: Email;
	}
> = async (context, data) => {
	const internalTemplate = Object.values(constants.email.templates).find(
		(template) => template.key === data.template && template.external === false,
	);

	if (internalTemplate) {
		return {
			error: {
				type: "basic",
				status: 400,
				message: copy("server:core.email.templates.internal.only"),
			},
			data: undefined,
		};
	}

	return serviceWrapper(emailServices.sendEmail, {
		transaction: true,
	})(context, {
		type: "external",
		to: data.to,
		subject: data.subject,
		template: data.template,
		cc: data.cc,
		bcc: data.bcc,
		replyTo: data.replyTo,
		priority: data.priority,
		attachments: data.attachments,
		data: data.data,
		storage: data.storage,
		tenantKey: data.tenantKey,
		from: data.from,
	});
};

export default sendExternal;
