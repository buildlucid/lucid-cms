import type z from "zod";
import type { NotificationLevel } from "../../types/response.js";
import type { EmailTemplateInput, EmailTemplateName } from "../email/types.js";
import type { AdminCopyInput, CopyInput } from "../i18n/types.js";
import type { Permission } from "../permission/types.js";

/** Groups types in the settings and inbox. Share one object across the types it covers. */
export type NotificationCategory = {
	key: string;
	label: AdminCopyInput;
};

/**
 * Who receives a type. `recipients` means the sender names them on every send.
 * A permission sends to everyone holding it, and admins can swap that for a role list.
 */
export type NotificationAudience = "recipients" | { permission: Permission };

export type NotificationRender = {
	title: CopyInput;
	body?: CopyInput;
	/** Admin path the notification opens, eg. `/admin/requests/12`. */
	href?: string;
	/** Overrides the type's level for this send. */
	level?: NotificationLevel;
};

/** Default notification email data, extended by `email.data`. */
export type NotificationEmailData = {
	title: string;
	body: string | null;
	actor: string | null;
	level: NotificationLevel;
	link: string | null;
	manageLink: string;
};

/** Project templates that accept `NotificationEmailData`, by declaring it in their `props` or with a rest prop. */
export type NotificationEmailTemplateName = {
	[Name in EmailTemplateName]: NotificationEmailData extends {
		[
			Key in keyof NotificationEmailData
		]: Key extends keyof EmailTemplateInput<Name>
			? EmailTemplateInput<Name>[Key]
			: never;
	}
		? Name
		: never;
}[EmailTemplateName];

/** Removes Lucid's default data from template props while preserving rest prop index signatures through key remapping. */
type NotificationEmailExtraData<Template extends string> = {
	[
		Key in keyof EmailTemplateInput<Template> as Key extends keyof NotificationEmailData
			? never
			: Key
	]: EmailTemplateInput<Template>[Key];
};

/** Accepts any extra data for Lucid's template, requiring `data` for project props Lucid doesn't supply. */
type NotificationEmailDataOption<Data, Template extends string> = [
	Template,
] extends [never]
	? {
			/** Extra template data merged with the defaults. */
			data?(props: { data: Data }): Record<string, unknown>;
		}
	: Record<string, never> extends NotificationEmailExtraData<Template>
		? {
				/** Extra template data merged with the defaults. */
				data?(props: { data: Data }): NotificationEmailExtraData<Template>;
			}
		: {
				/** The template's props that Lucid doesn't send. */
				data(props: { data: Data }): NotificationEmailExtraData<Template>;
			};

/** Notification email options with `Template` inferred from `template` to determine the data type. */
export type NotificationEmail<Data, Template extends string = never> = {
	/** Minutes to wait before emailing. Nobody is emailed about a notification they read or archive in the meantime, or once it is resolved. Defaults to 10. Use 0 for anything people must hear about straight away. */
	delayMinutes?: number;
	/** A project template accepting `NotificationEmailData`, defaulting to Lucid's template for the title, body and link. */
	template?: Template;
} & NotificationEmailDataOption<Data, Template>;

export type DefineNotificationOptions<
	Key extends string,
	Data extends z.ZodObject,
	Template extends NotificationEmailTemplateName = never,
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
	/** Requires in-app delivery while allowing users to disable email, defaulting to false. */
	mandatory?: boolean;
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
	email?: NotificationEmail<z.output<Data>, Template>;
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
	mandatory: boolean;
	audience: NotificationAudience;
	data: Data;
	defaults: {
		enabled: boolean;
		email: boolean;
	};
	//* method syntax keeps every data schema assignable to AnyNotificationDefinition
	render(props: { data: z.output<Data> }): NotificationRender;
	email: {
		delayMinutes: number;
		template?: string;
		data?(props: { data: z.output<Data> }): Record<string, unknown>;
	};
};

/** Any notification definition accepted by Lucid config. */
export type AnyNotificationDefinition = NotificationDefinition<
	string,
	z.ZodObject
>;

/** The data a definition accepts on send. */
export type NotificationData<Definition extends AnyNotificationDefinition> =
	z.input<Definition["data"]>;

export type NotificationReceipt = {
	/** Null when the type is turned off or nobody is left to tell. */
	id: number | null;
};
