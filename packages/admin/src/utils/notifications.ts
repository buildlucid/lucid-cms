import type {
	Notification,
	NotificationCategorySummary,
	NotificationSummary,
} from "@types";
import type { PillVariant } from "@/components/Pill/Pill";
import T from "@/translations";

export const isNotificationUnread = (notification: Notification) =>
	notification.readAt === null;

/** Open to-dos stay flagged until whatever caused them is dealt with. */
export const isNotificationOpen = (notification: Notification) =>
	notification.actionRequired && notification.resolvedAt === null;

export type NotificationState = "attention" | "resolved" | "unread" | "read";

/**
 * A single state per notification, so lists only ever show one label. To-dos
 * come first since they matter more than whether the row has been seen.
 */
export const getNotificationState = (
	notification: Notification,
): NotificationState => {
	if (isNotificationOpen(notification)) return "attention";
	if (notification.actionRequired) return "resolved";
	if (isNotificationUnread(notification)) return "unread";
	return "read";
};

export const notificationStates: Record<
	NotificationState,
	{ label: () => string; pill: PillVariant }
> = {
	attention: {
		label: () => T()("notifications.attention"),
		pill: "warning-subtle",
	},
	resolved: {
		label: () => T()("notifications.resolved"),
		pill: "success-subtle",
	},
	unread: {
		label: () => T()("notifications.unread"),
		pill: "primary-subtle",
	},
	read: {
		label: () => T()("notifications.read"),
		pill: "outline",
	},
};

/**
 * A key for notification lists that changes whenever the summary does, so
 * they refetch on new notifications and on reads or archives made elsewhere,
 * such as in another tab. Hold the lists back until the summary has loaded.
 */
export const getNotificationsListKey = (summary?: NotificationSummary) =>
	summary
		? [summary.unread, summary.actionRequired, summary.latestUpdatedAt]
		: undefined;

/**
 * Groups items by their category, keeping the order they came in. Render the
 * groups with `Index`, so rows stay mounted and keep what they have open when
 * the data refetches.
 */
export const groupByCategory = <
	T extends { category: NotificationCategorySummary },
>(
	items: T[],
) => {
	const groups = new Map<
		string,
		NotificationCategorySummary & { items: T[] }
	>();
	for (const item of items) {
		const group = groups.get(item.category.key) ?? {
			...item.category,
			items: [],
		};
		group.items.push(item);
		groups.set(item.category.key, group);
	}
	return [...groups.values()];
};
