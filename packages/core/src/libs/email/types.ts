import type { Markup as KilnMarkup } from "@lucidkiln/core";
import type z from "zod";
import type {
	emailDeliveryStatusSchema,
	emailTypeSchema,
} from "../../schemas/email.js";
import type { ServiceContext } from "../../utils/services/types.js";
import type { TranslatableCopy } from "../i18n/types.js";
import type { AdapterLifecycleContext } from "../runtime/types.js";
import type { Schema as BuiltInEmailSchema } from "./templates/built-in-schema.js";

export type { KilnMarkup };

/** Restricts Kiln props to JSON-storable email data, excluding markup, maps, sets and dates that storage cannot preserve. */
export type StorableEmailData<T> = T extends
	| KilnMarkup
	| Date
	| ReadonlyMap<unknown, unknown>
	| ReadonlySet<unknown>
	? never
	: T extends readonly (infer Item)[]
		? readonly StorableEmailData<Item>[]
		: T extends object
			? { [Key in keyof T]: StorableEmailData<T[Key]> }
			: T;

/** Data for Lucid's built-in templates, derived from their Kiln `props` and checked at send sites with `satisfies`. */
export type BuiltInEmailTemplates = {
	[Name in keyof BuiltInEmailSchema["templates"]]: StorableEmailData<
		BuiltInEmailSchema["templates"][Name]["context"]
	>;
};

/** Templates `toolkit.email.send` can use and the data each accepts, added by Lucid type generation from their Kiln `props`. */
// biome-ignore lint/suspicious/noEmptyInterface: generated types augment this interface
export interface EmailTemplates {}

/** A sendable template name: any string until type generation lists the project's templates. */
export type EmailTemplateName = [keyof EmailTemplates] extends [never]
	? string
	: Extract<keyof EmailTemplates, string>;

/** The data a template accepts once stored, or any record for a template type generation hasn't seen. */
export type EmailTemplateInput<Name extends string> =
	Name extends keyof EmailTemplates
		? StorableEmailData<EmailTemplates[Name]>
		: Record<string, unknown>;

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
