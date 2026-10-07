import constants from "../../../constants/constants.js";
import executeHooks from "../../../libs/hooks/execute-hooks.js";
import { normalizeCopy } from "../../../libs/i18n/copy.js";
import { copy } from "../../../libs/i18n/index.js";
import { enqueueJob } from "../../../libs/jobs/enqueue.js";
import { getRegisteredJob } from "../../../libs/jobs/registry.js";
import { getNotificationDefinition } from "../../../libs/notifications/registry.js";
import type {
	AnyNotificationDefinition,
	NotificationReceipt,
} from "../../../libs/notifications/types.js";
import {
	NotificationRecipientsRepository,
	NotificationsRepository,
} from "../../../libs/repositories/index.js";
import type { ServiceFn } from "../../../utils/services/types.js";
import getTypeSettings from "./get-type-settings.js";
import resolveRecipients from "./resolve-recipients.js";

/**
 * Creates a notification, or finds the one with the same type and key.
 * `send` leaves an open match alone. `upsert` refreshes its content and
 * recipients. Either reopens a resolved match. Refreshing drops people who
 * are no longer in the audience. Recipients are told again, in-app and by
 * email, when the notification is reopened or its fingerprint changes, and
 * people added later are emailed too. Emails go out after the caller's
 * transaction commits.
 */
const writeNotification: ServiceFn<
	[
		{
			mode: "send" | "upsert";
			definition: AnyNotificationDefinition;
			data: Record<string, unknown>;
			key?: string;
			fingerprint?: string;
			recipients?: number[];
			actorUserId?: number | null;
		},
	],
	NotificationReceipt
> = async (context, input) => {
	const Notifications = new NotificationsRepository(context.db);
	const Recipients = new NotificationRecipientsRepository(context.db);

	//* only registered types have settings and emails, so others are refused rather than half sent
	const definition = getNotificationDefinition(
		context.config,
		input.definition.key,
	);
	if (!definition) {
		return {
			error: {
				type: "basic",
				message: copy("server:core.notifications.type.not.found"),
				status: 404,
			},
			data: undefined,
		};
	}

	const parsed = await definition.data.safeParseAsync(input.data);
	if (!parsed.success) {
		return {
			error: {
				type: "validation",
				message: copy("server:core.notifications.data.invalid", {
					data: { type: definition.key },
				}),
				zod: parsed.error,
				status: 400,
			},
			data: undefined,
		};
	}
	const data: Record<string, unknown> = parsed.data;
	const actorUserId = input.actorUserId ?? null;
	const key = input.key ?? null;

	const settingsRes = await getTypeSettings(context, { definition });
	if (settingsRes.error) return settingsRes;
	if (!settingsRes.data.enabled) {
		return { error: undefined, data: { id: null } };
	}

	const recipientsRes = await resolveRecipients(context, {
		definition,
		roleIds: settingsRes.data.roleIds,
		recipients: input.recipients,
		actorUserId,
	});
	if (recipientsRes.error) return recipientsRes;

	const hookRes = await executeHooks(
		context,
		{ service: "notifications", event: "beforeSend", config: context.config },
		{
			meta: { type: definition.key, key, data, actorUserId },
			data: { recipients: recipientsRes.data },
		},
	);
	if (hookRes.error) return hookRes;

	const recipients = [...new Set(hookRes.data.recipients)];
	if (recipients.length === 0) return { error: undefined, data: { id: null } };

	const rendered = definition.render({ data });
	const now = new Date().toISOString();
	const content = {
		category: definition.category.key,
		level: rendered.level ?? definition.level,
		action_required: definition.actionRequired,
		title: normalizeCopy(rendered.title),
		body: normalizeCopy(rendered.body) ?? null,
		href: rendered.href ?? null,
		data,
		actor_user_id: actorUserId,
	};

	//* inserting first means two sends with the same key can't both create one
	const createRes = await Notifications.createIfKeyAbsent({
		data: {
			type: definition.key,
			key,
			...content,
			fingerprint: input.fingerprint ?? null,
			revision: 1,
			created_at: now,
			updated_at: now,
		},
		returning: ["id"],
	});
	if (createRes.error) return createRes;

	let id: number;
	let revision = 1;
	let notifyAgain = true;
	let added = recipients;

	if (createRes.data) {
		id = createRes.data.id;

		const recipientsCreateRes = await Recipients.createMultiple({
			data: recipients.map((userId) => ({
				notification_id: id,
				user_id: userId,
			})),
		});
		if (recipientsCreateRes.error) return recipientsCreateRes;
	} else {
		const existingRes = await Notifications.selectSingle({
			select: ["id", "revision", "fingerprint", "resolved_at"],
			where: [
				{ key: "type", operator: "=", value: definition.key },
				{ key: "key", operator: "=", value: key },
			],
			validation: { enabled: true },
		});
		if (existingRes.error) return existingRes;

		const existing = existingRes.data;
		if (input.mode === "send" && existing.resolved_at === null) {
			return { error: undefined, data: { id: existing.id } };
		}

		const fingerprint = input.fingerprint ?? existing.fingerprint;
		notifyAgain =
			existing.resolved_at !== null || fingerprint !== existing.fingerprint;
		revision = notifyAgain ? existing.revision + 1 : existing.revision;
		id = existing.id;

		const updateRes = await Notifications.updateSingle({
			data: {
				...content,
				fingerprint,
				revision,
				resolved_at: null,
				updated_at: now,
			},
			where: [{ key: "id", operator: "=", value: id }],
		});
		if (updateRes.error) return updateRes;

		const currentRes = await Recipients.selectMultiple({
			select: ["user_id"],
			where: [{ key: "notification_id", operator: "=", value: id }],
		});
		if (currentRes.error) return currentRes;

		const current = new Set((currentRes.data ?? []).map((row) => row.user_id));
		added = recipients.filter((userId) => !current.has(userId));
		//* the actor keeps their copy, everyone else outside the audience is dropped
		const removed = [...current].filter(
			(userId) => !recipients.includes(userId) && userId !== actorUserId,
		);

		if (removed.length > 0) {
			const deleteRes = await Recipients.deleteMultiple({
				where: [
					{ key: "notification_id", operator: "=", value: id },
					{ key: "user_id", operator: "in", value: removed },
				],
			});
			if (deleteRes.error) return deleteRes;
		}
		if (added.length > 0) {
			const addRes = await Recipients.createMultiple({
				data: added.map((userId) => ({ notification_id: id, user_id: userId })),
			});
			if (addRes.error) return addRes;
		}
		if (notifyAgain) {
			const unreadRes = await Recipients.updateMultiple({
				data: { read_at: null, archived_at: null },
				where: [
					{ key: "notification_id", operator: "=", value: id },
					{ key: "user_id", operator: "in", value: recipients },
				],
			});
			if (unreadRes.error) return unreadRes;
		}
	}

	//* the job is read from the registry rather than imported, as importing it here would form an import cycle through defineJob
	const emailJob = getRegisteredJob(
		context.config,
		constants.notifications.emailJob,
	);
	if (settingsRes.data.email && emailJob && (notifyAgain || added.length > 0)) {
		//* a job for people added to a revision can't share its key, so the job's own claim stops repeats
		const jobRes = await enqueueJob(context, {
			job: emailJob,
			payload: { notificationId: id, revision },
			options: notifyAgain
				? { idempotencyKey: `notification:${id}:${revision}` }
				: undefined,
		});
		if (jobRes.error) return jobRes;
	}

	const afterRes = await executeHooks(
		context,
		{ service: "notifications", event: "afterSend", config: context.config },
		{
			meta: { type: definition.key, key, data, actorUserId },
			data: {
				id,
				type: definition.key,
				key,
				recipients,
				created: createRes.data !== undefined,
			},
		},
	);
	if (afterRes.error) return afterRes;

	return { error: undefined, data: { id } };
};

export default writeNotification;
