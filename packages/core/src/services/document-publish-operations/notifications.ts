import constants from "../../constants/constants.js";
import {
	AlertRecipientsRepository,
	AlertsRepository,
} from "../../libs/repositories/index.js";
import { getBaseUrl } from "../../utils/helpers/index.js";
import type { ServiceFn } from "../../utils/services/types.js";
import sendEmail from "../email/send-email.js";

export type PublishOperationNotificationRecipient = {
	id: number;
	email: string | null;
};

const notifyPublishOperationUsers: ServiceFn<
	[
		{
			operationId: number;
			collectionKey: string;
			documentId: number;
			recipients: PublishOperationNotificationRecipient[];
			title: string;
			message: string;
			dedupeAction: string;
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

	const alertRes = await Alerts.createSingle({
		data: {
			type: constants.alerts.publishRequest.type,
			level: "info",
			dedupe_key: `publish-request:${data.operationId}:${data.dedupeAction}`,
			title: data.title,
			message: data.message,
			metadata: {
				operationId: data.operationId,
				collectionKey: data.collectionKey,
				documentId: data.documentId,
				action: data.dedupeAction,
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
		const actionUrl = `${getBaseUrl(context)}/lucid/collections/${data.collectionKey}/${data.documentId}/publish-requests/${data.operationId}`;
		const emailRes = await sendEmail(context, {
			type: "internal",
			to: emailRecipients,
			subject: data.title,
			template: constants.email.templates.publishRequest.key,
			data: {
				brand: context.config.brand,
				logoUrl: constants.email.assets.logo,
				title: data.title,
				message: data.message,
				actionUrl,
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
