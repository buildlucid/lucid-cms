import type z from "zod";
import type {
	emailDeliveryStatusSchema,
	emailTypeSchema,
} from "../../schemas/email.js";
import type { ServiceContext } from "../../utils/services/types.js";
import type { TranslatableCopy } from "../i18n/types.js";
import type { AdapterLifecycleContext } from "../runtime/types.js";

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

export type EmailContextData = {
	brand: {
		name: string;
		logoPath: string;
	};
	host: string;
};

export type EmailTemplateData = Record<string, unknown> & {
	context: EmailContextData;
};

/** A subject string or callback receiving template data, including Lucid context. */
export type EmailSubject = string | ((data: EmailTemplateData) => string);

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

/** Provider delivery outcome. Include an externalMessageId when later webhook events can update delivery status. */
export type EmailStrategyResponse = {
	success: boolean;
	deliveryStatus: EmailDeliveryStatus;
	message: TranslatableCopy;
	/** Provider message identifier used to correlate delivery events. */
	externalMessageId?: string | null;
	/** Provider metadata retained with the send result. */
	data?: Record<string, unknown> | null;
};

/** Rendered email and delivery options passed to the configured provider. */
export type EmailAdapterSendParams = {
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
	data: Record<string, unknown>;
	/** Name of the template used to render this email. */
	template: string;
};

/** Send the rendered email and report provider success or failure. */
export type EmailAdapterServiceSend = (
	context: ServiceContext,
	params: EmailAdapterSendParams,
) => Promise<EmailStrategyResponse>;

/** Factory that returns a configured adapter, synchronously or asynchronously. */
export type EmailAdapter<T = undefined> = T extends undefined
	? () => EmailAdapterInstance | Promise<EmailAdapterInstance>
	: (options: T) => EmailAdapterInstance | Promise<EmailAdapterInstance>;

/** Adapter contract used by Lucid. Use the context supplied to each operation for current request and transaction state. */
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
		init?: (context: AdapterLifecycleContext) => Promise<void>;
		/** Destroy the adapter */
		destroy?: (context: AdapterLifecycleContext) => Promise<void>;
	};
	/** Send an email */
	send: EmailAdapterServiceSend;
};
