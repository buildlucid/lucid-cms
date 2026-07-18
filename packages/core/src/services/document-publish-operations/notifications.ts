import constants from "../../constants/constants.js";
import {
	AlertRecipientsRepository,
	AlertsRepository,
} from "../../libs/repositories/index.js";
import type { ErrorCopy } from "../../types/errors.js";
import type { ServiceFn } from "../../utils/services/types.js";
import sendEmail from "../email/send-email.js";

export type PublishOperationNotificationRecipient = {
	id: number;
	email: string | null;
};

type PublishOperationNotificationDetail = {
	label: ErrorCopy;
	value: string | number | Date | null | undefined;
};

const formatNotificationDetailValue = (
	value: PublishOperationNotificationDetail["value"],
) => {
	if (value instanceof Date) return value.toISOString();
	return String(value);
};

const notifyPublishOperationUsers: ServiceFn<
	[
		{
			operationId: number;
			collectionKey: string;
			documentId: number;
			recipients: PublishOperationNotificationRecipient[];
			title: ErrorCopy;
			message: ErrorCopy;
			dedupeAction: string;
			comment?: {
				label: ErrorCopy;
				value: string | null | undefined;
				html: string | null | undefined;
			};
			details?: PublishOperationNotificationDetail[];
		},
	],
	undefined
> = async (context, data) => {
	const uniqueRecipients = Array.from(
		new Map(
			data.recipients.map((recipient) => [recipient.id, recipient]),
		).values(),
	);
	if (uniqueRecipients.length === 0) {
		return {
			error: undefined,
			data: undefined,
		};
	}

	const Alerts = new AlertsRepository(context.db.client, context.config.db);
	const AlertRecipients = new AlertRecipientsRepository(
		context.db.client,
		context.config.db,
	);
	const title = context.translate(data.title) ?? "";
	const message = context.translate(data.message);
	const details = (data.details ?? [])
		.filter((detail) => detail.value !== null && detail.value !== undefined)
		.map((detail) => ({
			label: context.translate(detail.label) ?? "",
			value: formatNotificationDetailValue(detail.value),
		}));
	const comment = data.comment?.value?.trim() || null;
	const commentHtml = data.comment?.html?.trim() || null;
	const commentLabel = data.comment
		? context.translate(data.comment.label)
		: undefined;

	const alertRes = await Alerts.createSingle({
		data: {
			type: constants.alerts.publishRequest.type,
			level: "info",
			dedupe_key: `publish-request:${data.operationId}:${data.dedupeAction}`,
			title,
			message,
			metadata: {
				operationId: data.operationId,
				collectionKey: data.collectionKey,
				documentId: data.documentId,
				action: data.dedupeAction,
				comment,
				details,
			},
			email_id: null,
		},
		returning: ["id"],
		validation: {
			enabled: true,
		},
	});
	if (alertRes.error) return alertRes;

	const recipientRes = await AlertRecipients.createMultiple({
		data: uniqueRecipients.map((recipient) => ({
			alert_id: alertRes.data.id,
			user_id: recipient.id,
		})),
	});
	if (recipientRes.error) return recipientRes;

	const emailRecipients = uniqueRecipients.flatMap((recipient) =>
		recipient.email ? [recipient.email] : [],
	);
	if (emailRecipients.length > 0) {
		const actionUrl = `/lucid/collections/${data.collectionKey}/${data.documentId}/release-requests/${data.operationId}`;
		const emailRes = await sendEmail(context, {
			type: "internal",
			to: emailRecipients,
			subject: title,
			template: constants.email.templates.publishRequest.key,
			data: {
				title,
				message,
				actionUrl,
				details,
				hasDetails: details.length > 0,
				comment,
				commentHtml,
				commentLabel,
			},
			storage: constants.email.templates.publishRequest.storage ?? undefined,
		});
		if (emailRes.error) return emailRes;
	}

	return {
		error: undefined,
		data: undefined,
	};
};

export default notifyPublishOperationUsers;
