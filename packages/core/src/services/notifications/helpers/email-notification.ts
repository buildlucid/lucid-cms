import constants from "../../../constants/constants.js";
import formatter from "../../../libs/formatters/index.js";
import { copy } from "../../../libs/i18n/index.js";
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
import type { ServiceFn } from "../../../utils/services/types.js";
import getAgentActors from "../../agent/helpers/get-agent-actors.js";
import sendEmail from "../../email/send-email.js";
import getTypeSettings from "./get-type-settings.js";

type DueEmail = NonNullable<
	Awaited<
		ReturnType<NotificationRecipientsRepository["selectDueEmails"]>
	>["data"]
>[number];

/**
 * Emails people who are due an email about one notification. Each person is
 * claimed first, so overlapping jobs never email anyone twice. Everyone is
 * claimed without an email once the notification is resolved or its type
 * stops sending emails, and so is anyone who read or archived it, opted out
 * or can no longer sign in.
 */
const emailNotification: ServiceFn<
	[{ notificationId: number; before: string; recipients: DueEmail[] }],
	undefined
> = async (context, data) => {
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
			"actor_user_id",
			"actor_run_id",
			"resolved_at",
		],
		where: [{ key: "id", operator: "=", value: data.notificationId }],
	});
	if (notificationRes.error) return notificationRes;

	const notification = notificationRes.data;
	if (!notification) return { error: undefined, data: undefined };

	const definition = getNotificationDefinition(
		context.config,
		notification.type,
	);
	const settingsRes = definition
		? await getTypeSettings(context, { definition })
		: undefined;
	if (settingsRes?.error) return settingsRes;

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

	const agentsRes = await getAgentActors(context, {
		runIds: [notification.actor_run_id],
	});
	if (agentsRes.error) return agentsRes;

	const baseUrl = getBaseUrl(context);
	const title = context.translate(notification.title);
	const body = context.translate(notification.body ?? undefined) ?? null;
	const person = actorRes?.data
		? [actorRes.data.first_name, actorRes.data.last_name]
				.filter(Boolean)
				.join(" ") || actorRes.data.username
		: null;
	const agent = notification.actor_run_id
		? agentsRes.data.get(notification.actor_run_id)?.name
		: undefined;
	const actor = agent
		? person
			? context.translate(
					copy("server:core.notifications.actor.agent", {
						data: { agent, person },
					}),
				)
			: agent
		: person;

	for (const recipient of data.recipients) {
		const claimRes = await Recipients.claimEmail({
			notificationId: notification.id,
			userId: recipient.user_id,
			before: data.before,
		});
		if (claimRes.error) return claimRes;
		if (!claimRes.data) continue;

		if (
			!definition ||
			!settingsRes?.data.enabled ||
			!settingsRes.data.email ||
			notification.resolved_at !== null ||
			recipient.read_at !== null ||
			recipient.archived_at !== null ||
			formatter.formatBoolean(recipient.is_deleted) ||
			formatter.formatBoolean(recipient.is_locked)
		) {
			continue;
		}

		const wantsEmail =
			recipient.email_enabled === null
				? definition.defaults.email
				: formatter.formatBoolean(recipient.email_enabled);
		if (!wantsEmail) continue;

		const sendRes = await sendEmail(context, {
			type: "internal",
			to: recipient.email,
			subject: (emailData) =>
				formatEmailSubject(title, emailData.context.brand.name),
			template:
				definition.email.template ?? constants.email.templates.notification.key,
			priority: notification.level === "error" ? "high" : "normal",
			isSystem: true,
			data: {
				title,
				body,
				actor,
				level: notification.level,
				link: notification.href ? `${baseUrl}${notification.href}` : null,
				manageLink: `${baseUrl}${constants.email.locations.account}`,
				...definition.email.data?.({ data: notification.data }),
			},
		});
		if (sendRes.error) return sendRes;

		const updateRes = await Recipients.updateSingle({
			data: { email_id: sendRes.data.email.id },
			where: [
				{ key: "notification_id", operator: "=", value: notification.id },
				{ key: "user_id", operator: "=", value: recipient.user_id },
			],
		});
		if (updateRes.error) return updateRes;
	}

	return { error: undefined, data: undefined };
};

export default emailNotification;
