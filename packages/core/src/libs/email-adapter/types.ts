import type z from "zod/v4";
import type {
	emailDeliveryStatusSchema,
	emailTypeSchema,
} from "../../schemas/email.js";

export type RenderedTemplates = {
	[templateName: string]: {
		html: string;
		lastModified: string;
	};
};

export type EmailDeliveryStatus = z.infer<typeof emailDeliveryStatusSchema>;
export type EmailType = z.infer<typeof emailTypeSchema>;

export type EmailStrategyResponse = {
	success: boolean;
	deliveryStatus: EmailDeliveryStatus;
	message: string;
	externalMessageId?: string | null;
	data?: Record<string, unknown> | null;
};

export type EmailAdapterServiceSend = (
	email: {
		to: string;
		subject: string;
		from: {
			email: string;
			name: string;
		};
		html: string;
		text?: string;
		cc?: string;
		bcc?: string;
		replyTo?: string;
	},
	meta: {
		data: {
			[key: string]: unknown;
		};
		template: string;
	},
) => Promise<EmailStrategyResponse>;

export type EmailAdapter<T = undefined> = T extends undefined
	? () => EmailAdapterInstance | Promise<EmailAdapterInstance>
	: (options: T) => EmailAdapterInstance | Promise<EmailAdapterInstance>;

export type EmailAdapterInstance = {
	/** The adapter type */
	type: "email-adapter";
	/** A unique identifier key for the adapter of this type */
	key: "passthrough" | string;
	/**
	 * Lifecycle callbacks
	 */
	lifecycle?: {
		/** Initialize the adapter */
		init?: () => Promise<void>;
		/** Destroy the adapter */
		destroy?: () => Promise<void>;
	};
	/** The email adapter services */
	services: {
		send: EmailAdapterServiceSend;
	};
};
