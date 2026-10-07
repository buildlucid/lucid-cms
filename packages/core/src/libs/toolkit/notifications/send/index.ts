import type {
	ServiceContext,
	ServiceResponse,
} from "../../../../utils/services/types.js";
import type {
	AnyNotificationDefinition,
	NotificationReceipt,
} from "../../../notifications/types.js";
import { runToolkitService } from "../../utils.js";
import { sendSchema } from "../schema.js";
import type { ToolkitNotificationsSendInput } from "../types.js";

const send = <Definition extends AnyNotificationDefinition>(
	context: ServiceContext,
	input: ToolkitNotificationsSendInput<Definition>,
): ServiceResponse<NotificationReceipt> =>
	runToolkitService({
		schema: sendSchema,
		input,
		handler: async (data) => {
			const { default: sendNotification } = await import(
				"../../../../services/notifications/send.js"
			);

			return sendNotification(context, {
				definition: data.type,
				data: data.data,
				key: data.key,
				fingerprint: data.fingerprint,
				recipients: data.recipients,
				actorUserId: data.actorUserId,
			});
		},
		name: {
			key: "core.toolkit.notifications.send.error.name",
			defaultMessage: "Notifications Toolkit Error",
		},
		message: {
			key: "core.toolkit.notifications.send.error.message",
			defaultMessage: "Lucid toolkit could not send the notification.",
		},
	});

export default send;
