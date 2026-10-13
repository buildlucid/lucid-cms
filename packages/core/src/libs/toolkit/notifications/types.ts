import type {
	AnyNotificationDefinition,
	NotificationData,
} from "../../notifications/types.js";
import type { ToolkitActor } from "../../permission/toolkit-actor.js";

/** A notification to send. Types with a `recipients` audience need `recipients`. */
export type ToolkitNotificationsSendInput<
	Definition extends AnyNotificationDefinition,
> = {
	type: Definition;
	data: NotificationData<Definition>;
	/** Event identity used to preserve open matches and reopen resolved matches on repeated sends. */
	key?: string;
	/** Change it to tell recipients again, eg. when a threshold climbs. */
	fingerprint?: string;
	recipients?: number[];
	/**
	 * Actor responsible for the event, such as `execution.actor`, defaulting to the system.
	 * @remarks User actors are excluded from recipients unless an agent acted for them; `agentRunId` displays the agent as actor and includes its user among eligible recipients.
	 */
	actor?: ToolkitActor;
};

export type ToolkitNotificationsUpsertInput<
	Definition extends AnyNotificationDefinition,
> = ToolkitNotificationsSendInput<Definition> & {
	key: string;
};

export type ToolkitNotificationsResolveInput<
	Definition extends AnyNotificationDefinition,
> = {
	type: Definition;
	key: string;
};
