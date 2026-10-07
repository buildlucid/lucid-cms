import type z from "zod";
import type { NotificationLevel } from "../db/tables/notifications.js";
import type { AdminCopyInput, CopyInput } from "../i18n/types.js";

/** Groups types in the settings and inbox. Share one object across the types it covers. */
export type NotificationCategory = {
	key: string;
	label: AdminCopyInput;
};

/**
 * Who receives a type. `recipients` means the sender names them on every send.
 * A permission sends to everyone holding it, and admins can swap that for a role list.
 */
export type NotificationAudience = "recipients" | { permission: string };

export type NotificationRender = {
	title: CopyInput;
	body?: CopyInput;
	/** Admin path the notification opens, eg. `/lucid/requests/12`. */
	href?: string;
	/** Overrides the type's level for this send. */
	level?: NotificationLevel;
};

export type NotificationEmail<Data> = {
	/** Template name. Defaults to Lucid's notification template, which renders the title, body and link. */
	template?: string;
	/** Extra template data merged with the defaults. */
	data?: (props: { data: Data }) => Record<string, unknown>;
};

export type DefineNotificationOptions<
	Key extends string,
	Data extends z.ZodObject,
> = {
	/** Unique `namespace:name` key, eg. `shop:order-failed`. */
	key: Key;
	category: NotificationCategory;
	name: AdminCopyInput;
	description?: AdminCopyInput;
	/** Defaults to `info`. */
	level?: NotificationLevel;
	/** Stays in people's to-do list until it is resolved. Defaults to false. */
	actionRequired?: boolean;
	/** Always delivered in-app. Admins and people can only turn its emails off. Defaults to false. */
	required?: boolean;
	audience: NotificationAudience;
	/** Validates the data passed on send. */
	data: Data;
	/** Starting settings. Both default to true. */
	defaults?: {
		enabled?: boolean;
		email?: boolean;
	};
	/** Builds the stored title, body and link from the data. Runs when the notification is sent. */
	render: (props: { data: z.output<Data> }) => NotificationRender;
	email?: NotificationEmail<z.output<Data>>;
};

export type NotificationDefinition<
	Key extends string = string,
	Data extends z.ZodObject = z.ZodObject,
> = {
	type: "notification-definition";
	key: Key;
	category: NotificationCategory;
	name: AdminCopyInput;
	description?: AdminCopyInput;
	level: NotificationLevel;
	actionRequired: boolean;
	required: boolean;
	audience: NotificationAudience;
	data: Data;
	defaults: {
		enabled: boolean;
		email: boolean;
	};
	render: (props: { data: z.output<Data> }) => NotificationRender;
	email?: NotificationEmail<z.output<Data>>;
};

// biome-ignore lint/suspicious/noExplicitAny: accepts any data schema
export type AnyNotificationDefinition = NotificationDefinition<string, any>;

/** The data a definition accepts on send. */
export type NotificationData<Definition extends AnyNotificationDefinition> =
	z.input<Definition["data"]>;

export type NotificationReceipt = {
	/** Null when the type is turned off or nobody is left to tell. */
	id: number | null;
};
