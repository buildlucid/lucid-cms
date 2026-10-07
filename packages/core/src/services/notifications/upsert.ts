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
 * Sends a notification, or refreshes the open one with the same key: its
 * content is replaced and new recipients are added. People are only told
 * again when the fingerprint changes or the notification was resolved.
 */
const upsert = <Definition extends AnyNotificationDefinition>(
	context: ServiceContext,
	data: {
		definition: Definition;
		data: NotificationData<Definition>;
		key: string;
		/** Change it to tell recipients again, eg. when a threshold climbs. */
		fingerprint?: string;
		recipients?: number[];
		actorUserId?: number | null;
	},
): ServiceResponse<NotificationReceipt> =>
	writeNotification(context, { ...data, mode: "upsert" });

export default upsert;
