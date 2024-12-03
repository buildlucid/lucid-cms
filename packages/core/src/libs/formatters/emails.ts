import Formatter from "./index.js";
import type { EmailResponse } from "../../types/response.js";
import type { JSONString } from "../db/types.js";

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
	type: string;
	sent_count: number;
	error_count: number;
	last_error_message: string | null;
	last_attempt_at: Date | string | null;
	last_success_at: Date | string | null;
	created_at: Date | string | null;
	data?: JSONString | null;
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
			data: (props.email.data as Record<string, unknown> | null) ?? null,
			sentCount: props.email.sent_count || 0,
			errorCount: props.email.error_count || 0,
			errorMessage: props.email.last_error_message,
			html: props.html ?? null,
			lastSuccessAt: Formatter.formatDate(props.email.last_success_at),
			lastAttemptAt: Formatter.formatDate(props.email.last_attempt_at),
			createdAt: Formatter.formatDate(props.email.created_at),
		};
	};
	static swagger = {
		type: "object",
		properties: {
			id: {
				type: "number",
			},
			emailHash: {
				type: "string",
			},
			type: {
				type: "string",
				enum: ["external", "internal"],
			},
			deliveryStatus: {
				type: "string",
				enum: ["sent", "failed", "pending"],
			},
			mailDetails: {
				type: "object",
				properties: {
					from: {
						type: "object",
						properties: {
							address: {
								type: "string",
							},
							name: {
								type: "string",
							},
						},
					},
					to: {
						type: "string",
					},
					subject: {
						type: "string",
					},
					cc: {
						type: "string",
						nullable: true,
					},
					bcc: {
						type: "string",
						nullable: true,
					},
					template: {
						type: "string",
					},
				},
			},
			data: {
				type: "object",
				nullable: true,
				additionalProperties: true,
			},
			sentCount: {
				type: "number",
			},
			errorCount: {
				type: "number",
			},
			errorMessage: {
				type: "string",
				nullable: true,
			},
			html: {
				type: "string",
				nullable: true,
			},
			lastSuccessAt: {
				type: "string",
				nullable: true,
			},
			lastAttemptAt: {
				type: "string",
				nullable: true,
			},
			createdAt: {
				type: "string",
				nullable: true,
			},
		},
	};
}
