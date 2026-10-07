import z from "zod";
import { copy } from "../../libs/i18n/copy.js";
import { notificationCategories } from "../../libs/notifications/categories.js";
import defineNotification from "../../libs/notifications/define-notification.js";
import { Permissions } from "../../libs/permission/definitions.js";
import { formatBytes } from "../../utils/helpers/index.js";

/** Media storage has crossed a usage threshold. Sent again as it climbs, and resolved once usage drops. */
export const storageNotification = defineNotification({
	key: "system:storage",
	category: notificationCategories.system,
	name: copy("admin:core.notifications.system.storage.name", {
		defaultMessage: "Storage usage",
	}),
	description: copy("admin:core.notifications.system.storage.description", {
		defaultMessage: "Media storage is close to its limit.",
	}),
	level: "warning",
	actionRequired: true,
	required: true,
	audience: { permission: Permissions.SettingsRead },
	email: { delayMinutes: 0 },
	data: z.object({
		thresholdPercent: z.number(),
		percentUsed: z.number(),
		storageUsed: z.number(),
		storageLimit: z.number(),
		storageRemaining: z.number(),
	}),
	render: ({ data }) => ({
		level: data.thresholdPercent >= 100 ? "error" : "warning",
		title: copy("server:core.notifications.system.storage.title", {
			data: { percent: data.percentUsed },
			defaultMessage: "Media storage is {{percent}}% full",
		}),
		body: copy("server:core.notifications.system.storage.body", {
			data: {
				used: formatBytes(data.storageUsed),
				limit: formatBytes(data.storageLimit),
				remaining: formatBytes(data.storageRemaining),
			},
			defaultMessage:
				"{{used}} of {{limit}} used, with {{remaining}} remaining. Delete unused media or raise the limit.",
		}),
		href: "/lucid/system/overview",
	}),
});
