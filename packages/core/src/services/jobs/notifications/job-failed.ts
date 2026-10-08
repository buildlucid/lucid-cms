import z from "zod";
import { copy } from "../../../libs/i18n/copy.js";
import { notificationCategories } from "../../../libs/notifications/categories.js";
import defineNotification from "../../../libs/notifications/define-notification.js";
import { Permissions } from "../../../libs/permission/definitions.js";

/**
 * A job failed after its final attempt. It's informational, since people can't
 * act on it in the admin. Keyed per job name and resolved once that job next
 * completes, so the next failure tells people again.
 */
export const jobFailedNotification = defineNotification({
	key: "system:job-failed",
	category: notificationCategories.system,
	name: copy("admin:core.notifications.system.job-failed.name", {
		defaultMessage: "Job failed",
	}),
	description: copy("admin:core.notifications.system.job-failed.description", {
		defaultMessage: "A background job fails after its final attempt.",
	}),
	level: "error",
	actionRequired: false,
	audience: { permission: Permissions.JobsRead },
	data: z.object({
		jobId: z.string(),
		jobName: z.string(),
		errorMessage: z.string(),
	}),
	render: ({ data }) => ({
		title: copy("server:core.notifications.system.job-failed.title", {
			data: { name: data.jobName },
			defaultMessage: "{{name}} failed",
		}),
		body: copy.literal(data.errorMessage),
		href: `/lucid/system/jobs?${new URLSearchParams({ "filter[jobId]": data.jobId })}`,
	}),
});
