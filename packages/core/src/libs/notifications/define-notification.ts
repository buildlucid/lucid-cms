import type z from "zod";
import constants from "../../constants/constants.js";
import { normalizeCopy } from "../i18n/copy.js";
import type {
	DefineNotificationOptions,
	NotificationDefinition,
} from "./types.js";

/**
 * Defines a notification type. Add it to `config.notifications`,
 * then send it with `toolkit.notifications.send`. Sends of unregistered types
 * are refused. People manage it in the notification settings and their own
 * email preferences. Emails wait `email.delayMinutes` and are skipped for
 * anyone who reads the notification first.
 *
 * @example
 * const orderFailed = defineNotification({
 * 	key: "shop:order-failed",
 * 	category: { key: "shop", label: "Shop" },
 * 	name: "Order failed",
 * 	description: "An order could not be processed.",
 * 	level: "error",
 * 	actionRequired: true,
 * 	audience: { permission: "shop:orders:manage" },
 * 	email: { delayMinutes: 0 },
 * 	data: z.object({ orderId: z.number(), reason: z.string() }),
 * 	render: ({ data }) => ({
 * 		title: `Order #${data.orderId} failed`,
 * 		body: data.reason,
 * 		href: `/lucid/shop/orders/${data.orderId}`,
 * 	}),
 * });
 */
const defineNotification = <const Key extends string, Data extends z.ZodObject>(
	options: DefineNotificationOptions<Key, Data>,
): NotificationDefinition<Key, Data> => ({
	type: "notification-definition",
	key: options.key,
	category: {
		key: options.category.key,
		label: normalizeCopy(options.category.label),
	},
	name: normalizeCopy(options.name),
	description: normalizeCopy(options.description),
	level: options.level ?? "info",
	actionRequired: options.actionRequired ?? false,
	required: options.required ?? false,
	audience: options.audience,
	data: options.data,
	defaults: {
		enabled: options.defaults?.enabled ?? true,
		email: options.defaults?.email ?? true,
	},
	render: options.render,
	email: {
		...options.email,
		delayMinutes:
			options.email?.delayMinutes ?? constants.notifications.emailDelayMinutes,
	},
});

export default defineNotification;
