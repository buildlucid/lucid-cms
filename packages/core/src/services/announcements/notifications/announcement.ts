import { copy } from "../../../libs/i18n/copy.js";
import { notificationCategories } from "../../../libs/notifications/categories.js";
import defineNotification from "../../../libs/notifications/define-notification.js";
import { Permissions } from "../../../libs/permission/definitions.js";
import { announcementNotificationData } from "./data.js";

/** News from Lucid, such as a release or a breaking change. In-app only by default, and resolved once Lucid ends it. */
export const announcementNotification = defineNotification({
	key: "lucid:announcement",
	category: notificationCategories.lucid,
	name: copy("admin:core.notifications.lucid.announcement.name", {
		defaultMessage: "Announcements",
	}),
	description: copy("admin:core.notifications.lucid.announcement.description", {
		defaultMessage: "News from Lucid, such as releases and breaking changes.",
	}),
	level: "info",
	audience: { permission: Permissions.SettingsRead },
	defaults: { email: false },
	data: announcementNotificationData,
	render: ({ data }) => ({
		title: copy.literal(data.title),
		body: copy.literal(data.message),
		href: data.url ?? undefined,
	}),
});
