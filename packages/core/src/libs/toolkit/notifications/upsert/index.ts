import type {
	ServiceContext,
	ServiceResponse,
} from "../../../../utils/services/types.js";
import type {
	AnyNotificationDefinition,
	NotificationReceipt,
} from "../../../notifications/types.js";
import { runToolkitService } from "../../utils.js";
import { upsertSchema } from "../schema.js";
import type { ToolkitNotificationsUpsertInput } from "../types.js";

const upsert = <Definition extends AnyNotificationDefinition>(
	context: ServiceContext,
	input: ToolkitNotificationsUpsertInput<Definition>,
): ServiceResponse<NotificationReceipt> =>
	runToolkitService({
		schema: upsertSchema,
		input,
		handler: async (data) => {
			const { default: upsertNotification } = await import(
				"../../../../services/notifications/upsert.js"
			);

			return upsertNotification(context, {
				definition: data.type,
				data: data.data,
				key: data.key,
				fingerprint: data.fingerprint,
				recipients: data.recipients,
				actorUserId: data.actorUserId,
				actorRunId: data.actorRunId,
			});
		},
		name: {
			key: "core.toolkit.notifications.upsert.error.name",
			defaultMessage: "Notifications Toolkit Error",
		},
		message: {
			key: "core.toolkit.notifications.upsert.error.message",
			defaultMessage: "Lucid toolkit could not upsert the notification.",
		},
	});

export default upsert;
