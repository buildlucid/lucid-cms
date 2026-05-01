import type z from "zod";
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
export type EmailPriority = "low" | "normal" | "high";
export type EmailHeaders = Record<string, string>;

/**
 * How the attachment should be presented:
 * - `attachment` appears as a normal file attachment.
 * - `inline` can be referenced in HTML with `cid:<contentId>`.
 */
export type EmailAttachmentDisposition = "attachment" | "inline";

type EmailAttachmentUrlBase = {
	/**
	 * Attachment source type.
	 */
	type: "url";
	/**
	 * Public HTTP/S URL for the attachment source.
	 */
	url: string;
	/**
	 * Filename shown to recipients.
	 */
	filename: string;
	/**
	 * Optional MIME type, such as `application/pdf`.
	 */
	contentType?: string;
};

/**
 * Attachment configuration for email sends.
 */
export type EmailAttachment =
	| (EmailAttachmentUrlBase & {
			/**
			 * Sends as a normal attachment. Default when omitted.
			 */
			disposition?: "attachment";
			/**
			 * Only valid for inline attachments.
			 */
			contentId?: never;
	  })
	| (EmailAttachmentUrlBase & {
			/**
			 * Sends as an inline CID attachment.
			 */
			disposition: "inline";
			/**
			 * Unique CID used in HTML as `cid:<contentId>`.
			 */
			contentId: string;
	  });

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
		priority: EmailPriority;
		headers?: EmailHeaders | null;
		attachments?: EmailAttachment[];
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
	/** Send an email */
	send: EmailAdapterServiceSend;
};
