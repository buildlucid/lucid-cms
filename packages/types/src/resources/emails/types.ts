export type EmailDeliveryStatus =
	| "sent"
	| "delivered"
	| "delayed"
	| "complained"
	| "bounced"
	| "clicked"
	| "failed"
	| "opened"
	| "scheduled";

export type EmailType = "external" | "internal";
export type EmailPriority = "low" | "normal" | "high";
export type EmailAttachment = {
	type: "url";
	url: string;
	filename: string;
	contentType: string | null;
	disposition: "attachment" | "inline";
	contentId: string | null;
};

export interface EmailTransaction {
	id: number;
	emailId: number;
	deliveryStatus: EmailDeliveryStatus;
	message: string | null;
	strategyIdentifier: string;
	strategyData: Record<string, unknown> | null;
	simulate: boolean;
	externalMessageId: string | null;
	createdAt: string | null;
	updatedAt: string | null;
}

export interface Email {
	id: number;
	mailDetails: {
		from: {
			address: string;
			name: string;
		};
		to: string;
		subject: string;
		cc: null | string;
		bcc: null | string;
		template: string;
		priority: EmailPriority;
	};
	data: Record<string, unknown> | null;
	attachments: EmailAttachment[];
	type: EmailType;
	currentStatus: EmailDeliveryStatus;
	attemptCount: number;
	lastAttemptedAt: string | null;
	html: string | null;
	resend: {
		enabled: boolean;
		reason?: "outsideResendWindow" | "unstoredData";
	};
	createdAt: string | null;
	updatedAt?: string | null;
}

/** Referenced sent email without template data or HTML, with recipients and delivery status omitted from content API reads. */
export interface EmailRef {
	id: number;
	subject: string;
	template: string;
	from: {
		address: string;
		name: string;
	};
	to?: string;
	cc?: string | null;
	bcc?: string | null;
	currentStatus?: EmailDeliveryStatus;
	createdAt: string | null;
}
