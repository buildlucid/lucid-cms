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
 * Creates or refreshes a keyed notification. Unchanged content keeps its inbox position;
 * fingerprint changes or reopening notify recipients again.
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
		actorRunId?: string | null;
	},
): ServiceResponse<NotificationReceipt> =>
	writeNotification(context, { ...data, mode: "upsert" });

export default upsert;
