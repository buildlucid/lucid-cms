import z from "zod";
import { copy } from "../../../libs/i18n/copy.js";
import { notificationCategories } from "../../../libs/notifications/categories.js";
import defineNotification from "../../../libs/notifications/define-notification.js";

/**
 * Success notice keyed per deploy, refreshed on each success.
 * @remarks Email defaults to off. Registered only when deploys are configured.
 */
export const deploySucceededNotification = defineNotification({
	key: "deploys:succeeded",
	category: notificationCategories.deploys,
	name: copy("admin:core.notifications.deploys.succeeded.name", {
		defaultMessage: "Deploy succeeded",
	}),
	description: copy("admin:core.notifications.deploys.succeeded.description", {
		defaultMessage: "A deploy run finishes and its changes are live.",
	}),
	level: "success",
	actionRequired: false,
	audience: "recipients",
	defaults: { email: false },
	data: z.object({
		deployKey: z.string(),
		name: z.string(),
		/** Who or what started the run and how long it took. */
		detail: z.string().nullable(),
	}),
	render: ({ data }) => ({
		title: copy("server:core.notifications.deploys.succeeded.title", {
			data: { name: data.name },
			defaultMessage: "{{name}} is live",
		}),
		...(data.detail && { body: copy.literal(data.detail) }),
		href: `/admin/system/deploys#deploy-${data.deployKey}`,
	}),
});
