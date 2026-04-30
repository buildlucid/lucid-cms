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
	type: EmailType;
	currentStatus: EmailDeliveryStatus;
	attemptCount: number;
	lastAttemptedAt: string | null;
	html: string | null;
	resend: {
		enabled: boolean;
		reason?: "outsideResendWindow" | "unstoredData";
	};
	transactions: {
		deliveryStatus: EmailDeliveryStatus;
		message: string | null;
		strategyIdentifier: string;
		strategyData: Record<string, unknown> | null;
		simulate: boolean;
		externalMessageId: string | null;
		createdAt: string | null;
		updatedAt: string | null;
	}[];
	createdAt: string | null;
	updatedAt?: string | null;
}
