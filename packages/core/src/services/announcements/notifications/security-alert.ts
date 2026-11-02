import { copy } from "../../../libs/i18n/copy.js";
import { notificationCategories } from "../../../libs/notifications/categories.js";
import defineNotification from "../../../libs/notifications/define-notification.js";
import { Permissions } from "../../../libs/permission/definitions.js";
import { announcementNotificationData } from "./data.js";

/**
 * A security fix from Lucid for the installed version. Emailed straight away
 * and kept as a to-do until an update takes the site out of the affected
 * versions or Lucid withdraws it.
 */
export const securityAlertNotification = defineNotification({
	key: "lucid:security-alert",
	category: notificationCategories.lucid,
	name: copy("admin:core.notifications.lucid.security-alert.name", {
		defaultMessage: "Security alerts",
	}),
	description: copy(
		"admin:core.notifications.lucid.security-alert.description",
		{
			defaultMessage: "Lucid publishes a security fix for your version.",
		},
	),
	level: "error",
	actionRequired: true,
	mandatory: true,
	audience: { permission: Permissions.SettingsRead },
	email: { delayMinutes: 0 },
	data: announcementNotificationData,
	render: ({ data }) => ({
		title: copy.literal(data.title),
		body: copy.literal(data.message),
		href: data.url ?? undefined,
	}),
});
