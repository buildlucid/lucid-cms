import z from "zod";
import constants from "../../../constants/constants.js";
import defineJob from "../../../libs/jobs/define-job.js";
import type { JobHandler } from "../../../libs/jobs/types.js";
import { NotificationRecipientsRepository } from "../../../libs/repositories/index.js";
import emailNotification from "../helpers/email-notification.js";

const input = z
	.object({ notificationId: z.number().int().positive() })
	.nullable();

/**
 * Sends notification emails that are due. Runs every minute for delayed
 * emails, and is enqueued with a notification ID when a type sends without a
 * delay. Scheduled runs handle a batch, leaving the rest for the next one.
 * Emails overdue by more than `emailExpiryHours` are dropped rather than sent late.
 */
const sendNotificationEmails: JobHandler<z.infer<typeof input>> = async ({
	context,
	input,
}) => {
	const Recipients = new NotificationRecipientsRepository(context.db);
	const now = Date.now();
	const before = new Date(now).toISOString();

	const expiredRes = await Recipients.clearExpiredEmails({
		before: new Date(
			now - constants.notifications.emailExpiryHours * 3_600_000,
		).toISOString(),
	});
	if (expiredRes.error) return expiredRes;

	const dueRes = await Recipients.selectDueEmails({
		before,
		notificationId: input?.notificationId,
		limit: input ? undefined : constants.notifications.emailBatchSize,
	});
	if (dueRes.error) return dueRes;

	const due = dueRes.data ?? [];
	for (const notificationId of new Set(
		due.map((recipient) => recipient.notification_id),
	)) {
		const emailRes = await emailNotification(context, {
			notificationId,
			before,
			recipients: due.filter(
				(recipient) => recipient.notification_id === notificationId,
			),
		});
		if (emailRes.error) return emailRes;
	}

	return { error: undefined, data: undefined };
};

export const sendNotificationEmailsJob = defineJob({
	name: constants.notifications.emailJob.name,
	version: constants.notifications.emailJob.version,
	input,
	transaction: true,
	schedules: [
		{ name: "automatic", cron: "* * * * *", timezone: "UTC", input: null },
	],
	handler: sendNotificationEmails,
	describe: ({ input }) => input ?? {},
});
