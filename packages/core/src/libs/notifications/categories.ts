import { copy } from "../i18n/copy.js";
import type { NotificationCategory } from "./types.js";

/** Categories used by Lucid's own notification types. Plugins can reuse them or define their own. */
export const notificationCategories = {
	system: {
		key: "system",
		label: copy("admin:core.notifications.category.system", {
			defaultMessage: "System",
		}),
	},
	requests: {
		key: "requests",
		label: copy("admin:core.notifications.category.requests", {
			defaultMessage: "Requests",
		}),
	},
	workflows: {
		key: "workflows",
		label: copy("admin:core.notifications.category.workflows", {
			defaultMessage: "Workflows",
		}),
	},
} as const satisfies Record<string, NotificationCategory>;
