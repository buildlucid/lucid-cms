import Formatter from "./index.js";
import type { EmailResponse } from "../../types/response.js";
import type { BooleanInt } from "../../types.js";

interface EmailPropT {
	id: number;
	email_hash: string;
	from_address: string;
	from_name: string;
	to_address: string;
	subject: string;
	cc: string | null;
	bcc: string | null;
	delivery_status: string;
	template: string;
	strategy_identifier: string;
	strategy_data: Record<string, unknown> | null;
	type: string;
	sent_count: number;
	error_count: number;
	last_error_message: string | null;
	last_attempt_at: Date | string | null;
	last_success_at: Date | string | null;
	simulate: BooleanInt;
	created_at: Date | string | null;
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
			deliveryStatus: props.email.delivery_status as
				| "sent"
				| "failed"
				| "pending",
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
			sentCount: props.email.sent_count || 0,
			errorCount: props.email.error_count || 0,
			errorMessage: props.email.last_error_message,
			html: props.html ?? null,
			strategyIdentifier: props.email.strategy_identifier,
			strategyData: props.email.strategy_data,
			lastSuccessAt: Formatter.formatDate(props.email.last_success_at),
			lastAttemptAt: Formatter.formatDate(props.email.last_attempt_at),
			simulate: Formatter.formatBoolean(props.email.simulate),
			createdAt: Formatter.formatDate(props.email.created_at),
		};
	};
}
