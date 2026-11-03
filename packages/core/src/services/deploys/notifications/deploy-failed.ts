import z from "zod";
import { copy } from "../../../libs/i18n/copy.js";
import { notificationCategories } from "../../../libs/notifications/categories.js";
import defineNotification from "../../../libs/notifications/define-notification.js";

/**
 * Failure notice keyed per deploy, resolved by success. Emails eligible recipients unless already
 * read or resolved.
 * @remarks Registered only when deploys are configured.
 */
export const deployFailedNotification = defineNotification({
	key: "deploys:failed",
	category: notificationCategories.deploys,
	name: copy("admin:core.notifications.deploys.failed.name", {
		defaultMessage: "Deploy failed",
	}),
	description: copy("admin:core.notifications.deploys.failed.description", {
		defaultMessage: "A deploy run fails or times out.",
	}),
	level: "error",
	actionRequired: false,
	audience: "recipients",
	data: z.object({
		deployKey: z.string(),
		name: z.string(),
		status: z.enum(["failed", "timed-out"]),
		message: z.string().nullable(),
		/** Who or what started the run, how long it ran and the host's message. */
		detail: z.string().nullable(),
	}),
	render: ({ data }) => ({
		title:
			data.status === "timed-out"
				? copy("server:core.notifications.deploys.timed-out.title", {
						data: { name: data.name },
						defaultMessage: "{{name}} deploy timed out",
					})
				: copy("server:core.notifications.deploys.failed.title", {
						data: { name: data.name },
						defaultMessage: "{{name}} deploy failed",
					}),
		...((data.detail ?? data.message) && {
			body: copy.literal(data.detail ?? data.message ?? ""),
		}),
		href: `/admin/system/deploys?${new URLSearchParams({ "filter[deployKey]": data.deployKey })}`,
	}),
});
