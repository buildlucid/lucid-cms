import type { ResolvedLucidConfig } from "../../types/config.js";
import type {
	Notification,
	NotificationPreference,
	NotificationType,
	RequestUser,
} from "../../types/response.js";
import type {
	LucidNotificationPreferences,
	LucidNotificationRecipients,
	LucidNotifications,
	LucidNotificationTypeSettings,
} from "../db/tables/index.js";
import type { Select } from "../db/types.js";
import type { Translator } from "../i18n/types.js";
import resolveTypeSettings from "../notifications/resolve-type-settings.js";
import type { AnyNotificationDefinition } from "../notifications/types.js";
import formatter from "./helpers.js";

type NotificationRow = Pick<
	Select<LucidNotifications>,
	| "id"
	| "type"
	| "category"
	| "level"
	| "action_required"
	| "title"
	| "body"
	| "href"
	| "data"
	| "actor_user_id"
	| "resolved_at"
	| "created_at"
	| "updated_at"
> &
	Pick<Select<LucidNotificationRecipients>, "read_at" | "archived_at">;

const formatCategory = (props: {
	definition: AnyNotificationDefinition | undefined;
	fallbackKey: string;
	translate: Translator;
}) =>
	props.definition
		? {
				key: props.definition.category.key,
				label: props.translate(props.definition.category.label),
			}
		: { key: props.fallbackKey, label: props.fallbackKey };

const formatMultiple = (props: {
	notifications: NotificationRow[];
	actors: Map<number, RequestUser>;
	config: Pick<ResolvedLucidConfig, "notifications">;
	translate: Translator;
}): Notification[] =>
	props.notifications.map((notification) => ({
		id: notification.id,
		type: notification.type,
		category: formatCategory({
			definition: props.config.notifications.find(
				(definition) => definition.key === notification.type,
			),
			fallbackKey: notification.category,
			translate: props.translate,
		}),
		level: notification.level,
		actionRequired: formatter.formatBoolean(notification.action_required),
		title: props.translate(notification.title),
		body: props.translate(notification.body ?? undefined) ?? null,
		href: notification.href,
		data: notification.data,
		actor:
			notification.actor_user_id === null
				? null
				: (props.actors.get(notification.actor_user_id) ?? null),
		readAt: formatter.formatDate(notification.read_at),
		archivedAt: formatter.formatDate(notification.archived_at),
		resolvedAt: formatter.formatDate(notification.resolved_at),
		createdAt: formatter.formatDate(notification.created_at),
		updatedAt: formatter.formatDate(notification.updated_at),
	}));

const formatTypes = (props: {
	definitions: AnyNotificationDefinition[];
	settings: Array<
		Pick<
			Select<LucidNotificationTypeSettings>,
			"type" | "enabled" | "email_enabled" | "role_ids"
		>
	>;
	translate: Translator;
}): NotificationType[] =>
	props.definitions.map((definition) => {
		const settings = resolveTypeSettings({
			definition,
			row: props.settings.find((row) => row.type === definition.key),
		});
		return {
			key: definition.key,
			name: props.translate(definition.name),
			description: props.translate(definition.description) ?? null,
			category: formatCategory({
				definition,
				fallbackKey: definition.category.key,
				translate: props.translate,
			}),
			level: definition.level,
			actionRequired: definition.actionRequired,
			required: definition.required,
			audience:
				definition.audience === "recipients"
					? "recipients"
					: {
							permission: definition.audience.permission,
							roleIds: settings.roleIds,
						},
			enabled: settings.enabled,
			email: settings.email,
			defaults: definition.defaults,
		};
	});

const formatPreferences = (props: {
	definitions: AnyNotificationDefinition[];
	settings: Array<
		Pick<
			Select<LucidNotificationTypeSettings>,
			"type" | "enabled" | "email_enabled" | "role_ids"
		>
	>;
	preferences: Array<
		Pick<Select<LucidNotificationPreferences>, "type" | "email_enabled">
	>;
	translate: Translator;
}): NotificationPreference[] =>
	props.definitions.flatMap((definition) => {
		const settings = resolveTypeSettings({
			definition,
			row: props.settings.find((row) => row.type === definition.key),
		});
		if (!settings.enabled) return [];

		const preference = props.preferences.find(
			(row) => row.type === definition.key,
		);
		return [
			{
				type: definition.key,
				name: props.translate(definition.name),
				description: props.translate(definition.description) ?? null,
				category: formatCategory({
					definition,
					fallbackKey: definition.category.key,
					translate: props.translate,
				}),
				emailAvailable: settings.email,
				email: preference
					? formatter.formatBoolean(preference.email_enabled)
					: definition.defaults.email,
			},
		];
	});

export default {
	formatMultiple,
	formatTypes,
	formatPreferences,
};
