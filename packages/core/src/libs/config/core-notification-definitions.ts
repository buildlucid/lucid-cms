import { notifications } from "../notifications/lucid-notifications.js";
import type { AnyNotificationDefinition } from "../notifications/types.js";

/** Notification types Lucid registers before the project and plugin definitions. */
const coreNotificationDefinitions = [
	notifications.storage,
	...Object.values(notifications.requests),
	...Object.values(notifications.workflows),
	...Object.values(notifications.agent),
] as const satisfies readonly AnyNotificationDefinition[];

export default coreNotificationDefinitions;
