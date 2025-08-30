import Formatter from "./index.js";
import type { EmailResponse } from "../../types/response.js";

interface EmailPropT {
	id: number;
	email_hash: string;
	from_address: string;
	from_name: string;
	to_address: string;
	subject: string;
	cc: string | null;
	bcc: string | null;
	template: string;
	type: string;
	created_at: Date | string | null;
	updated_at: Date | string | null;
	data?: Record<string, unknown> | null;
}

export default class EmailsFormatter {
	formatMultiple = (props: {
		emails: EmailPropT[];
	}) => {
		return props.emails.map((e) =>
			this.formatSingle({
				email: e,
			}),
		);
	};
	formatSingle = (props: {
		email: EmailPropT;
		html?: string;
	}): EmailResponse => {
		return {
			id: props.email.id,
			emailHash: props.email.email_hash,
			type: props.email.type as "external" | "internal",
			deliveryStatus: "pending",
			mailDetails: {
				from: {
					address: props.email.from_address,
					name: props.email.from_name,
				},
				to: props.email.to_address,
				subject: props.email.subject,
				cc: props.email.cc,
				bcc: props.email.bcc,
				template: props.email.template,
			},
			data: props.email.data ?? null,
			sentCount: 0,
			errorCount: 0,
			errorMessage: null,
			html: props.html ?? null,
			strategyData: null,
			lastSuccessAt: null,
			lastAttemptAt: null,
			simulate: false,
			createdAt: Formatter.formatDate(props.email.created_at),
			updatedAt: Formatter.formatDate(props.email.updated_at),
		};
	};
}
