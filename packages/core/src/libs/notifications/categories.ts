import { copy } from "../i18n/copy.js";
import type { NotificationCategory } from "./types.js";

/** Built-in categories accepted by `defineNotification`, alongside custom categories. */
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
	agent: {
		key: "agent",
		label: copy("admin:core.notifications.category.agent", {
			defaultMessage: "Agent",
		}),
	},
} as const satisfies Record<string, NotificationCategory>;
