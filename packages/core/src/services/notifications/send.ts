import type {
	AnyNotificationDefinition,
	NotificationData,
	NotificationReceipt,
} from "../../libs/notifications/types.js";
import type {
	ServiceContext,
	ServiceResponse,
} from "../../utils/services/types.js";
import writeNotification from "./helpers/write-notification.js";

/**
 * Sends a notification. With a key, a second send of the same open
 * notification does nothing, and a resolved one is reopened.
 */
const send = <Definition extends AnyNotificationDefinition>(
	context: ServiceContext,
	data: {
		definition: Definition;
		data: NotificationData<Definition>;
		key?: string;
		fingerprint?: string;
		/** Required for types with a `recipients` audience. */
		recipients?: number[];
		/** Left out of the recipients. */
		actorUserId?: number | null;
	},
): ServiceResponse<NotificationReceipt> =>
	writeNotification(context, { ...data, mode: "send" });

export default send;
