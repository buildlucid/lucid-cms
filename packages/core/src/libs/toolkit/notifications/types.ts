import type {
	AnyNotificationDefinition,
	NotificationData,
} from "../../notifications/types.js";

/** A notification to send. Types with a `recipients` audience need `recipients`. */
export type ToolkitNotificationsSendInput<
	Definition extends AnyNotificationDefinition,
> = {
	type: Definition;
	data: NotificationData<Definition>;
	/** Identifies the event, so sending it again updates or reopens the existing notification. */
	key?: string;
	/** Change it to tell recipients again, eg. when a threshold climbs. */
	fingerprint?: string;
	recipients?: number[];
	/** The person whose action caused it. They are left out of the recipients, unless an agent acted for them. */
	actorUserId?: number | null;
	/** The agent run that acted for the actor, eg. `execution.actor.agentRunId`. People see the agent as the actor, and the person it acted for is told too. */
	actorRunId?: string | null;
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
