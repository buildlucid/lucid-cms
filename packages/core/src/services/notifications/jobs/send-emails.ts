import z from "zod";
import constants from "../../../constants/constants.js";
import formatter from "../../../libs/formatters/index.js";
import defineJob from "../../../libs/jobs/define-job.js";
import type { JobHandler } from "../../../libs/jobs/types.js";
import { getNotificationDefinition } from "../../../libs/notifications/registry.js";
import {
	NotificationRecipientsRepository,
	NotificationsRepository,
	UsersRepository,
} from "../../../libs/repositories/index.js";
import {
	formatEmailSubject,
	getBaseUrl,
} from "../../../utils/helpers/index.js";
import sendEmail from "../../email/send-email.js";
import getTypeSettings from "../helpers/get-type-settings.js";

const input = z.object({
	notificationId: z.number().int().positive(),
	revision: z.number().int().positive(),
});

/**
 * Emails everyone who still wants to hear about a notification revision. It
 * skips quietly when the notification moved on, was resolved, or its type
 * no longer sends emails. Each person is claimed before they're emailed, so
 * overlapping jobs never email anyone twice. People who opted out are marked
 * as handled too, so turning emails on later doesn't deliver old news.
 */
const sendNotificationEmails: JobHandler<z.infer<typeof input>> = async ({
	context,
	input,
}) => {
	const Notifications = new NotificationsRepository(context.db);
	const Recipients = new NotificationRecipientsRepository(context.db);
	const Users = new UsersRepository(context.db);

	const notificationRes = await Notifications.selectSingle({
		select: [
			"id",
			"type",
			"level",
			"title",
			"body",
			"href",
			"data",
			"revision",
			"actor_user_id",
			"resolved_at",
		],
		where: [{ key: "id", operator: "=", value: input.notificationId }],
	});
	if (notificationRes.error) return notificationRes;

	const notification = notificationRes.data;
	if (
		!notification ||
		notification.revision !== input.revision ||
		notification.resolved_at !== null
	) {
		return { error: undefined, data: undefined };
	}

	const definition = getNotificationDefinition(
		context.config,
		notification.type,
	);
	if (!definition) return { error: undefined, data: undefined };

	const settingsRes = await getTypeSettings(context, { definition });
	if (settingsRes.error) return settingsRes;
	if (!settingsRes.data.enabled || !settingsRes.data.email) {
		return { error: undefined, data: undefined };
	}

	const candidatesRes = await Recipients.selectEmailCandidates({
		notificationId: notification.id,
		revision: notification.revision,
		type: notification.type,
	});
	if (candidatesRes.error) return candidatesRes;
	if ((candidatesRes.data ?? []).length === 0) {
		return { error: undefined, data: undefined };
	}

	const actorRes =
		notification.actor_user_id === null
			? undefined
			: await Users.selectSingle({
					select: ["first_name", "last_name", "username"],
					where: [
						{ key: "id", operator: "=", value: notification.actor_user_id },
					],
				});
	if (actorRes?.error) return actorRes;

	const baseUrl = getBaseUrl(context);
	const title = context.translate(notification.title);
	const body = context.translate(notification.body ?? undefined) ?? null;
	const actor = actorRes?.data
		? [actorRes.data.first_name, actorRes.data.last_name]
				.filter(Boolean)
				.join(" ") || actorRes.data.username
		: null;

	for (const candidate of candidatesRes.data ?? []) {
		const claimRes = await Recipients.claimEmail({
			notificationId: notification.id,
			userId: candidate.user_id,
			revision: notification.revision,
		});
		if (claimRes.error) return claimRes;
		if (!claimRes.data) continue;

		const wantsEmail =
			candidate.email_enabled === null
				? definition.defaults.email
				: formatter.formatBoolean(candidate.email_enabled);
		if (!wantsEmail) continue;

		const sendRes = await sendEmail(context, {
			type: "internal",
			to: candidate.email,
			subject: (emailData) =>
				formatEmailSubject(title, emailData.context.brand.name),
			template:
				definition.email?.template ??
				constants.email.templates.notification.key,
			priority: notification.level === "error" ? "high" : "normal",
			isSystem: true,
			data: {
				title,
				body,
				actor,
				level: notification.level,
				link: notification.href ? `${baseUrl}${notification.href}` : null,
				manageLink: `${baseUrl}${constants.email.locations.account}`,
				...definition.email?.data?.({ data: notification.data }),
			},
		});
		if (sendRes.error) return sendRes;

		const updateRes = await Recipients.updateSingle({
			data: { email_id: sendRes.data.email.id },
			where: [
				{ key: "notification_id", operator: "=", value: notification.id },
				{ key: "user_id", operator: "=", value: candidate.user_id },
			],
		});
		if (updateRes.error) return updateRes;
	}

	return { error: undefined, data: undefined };
};

export const sendNotificationEmailsJob = defineJob({
	name: constants.notifications.emailJob.name,
	version: constants.notifications.emailJob.version,
	input,
	transaction: true,
	handler: sendNotificationEmails,
	describe: ({ input: { notificationId, revision } }) => ({
		notificationId,
		revision,
	}),
});
