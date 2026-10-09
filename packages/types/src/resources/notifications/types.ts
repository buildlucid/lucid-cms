import type { AgentActor } from "../agent/types.js";
import type { RequestUser } from "../requests/types.js";

export type NotificationLevel = "info" | "success" | "warning" | "error";

/** Which of a person's notifications to list. */
export type NotificationStatus = "inbox" | "unread" | "attention" | "archived";

export type NotificationCategorySummary = {
	key: string;
	label: string;
};

export type Notification = {
	id: number;
	type: string;
	category: NotificationCategorySummary;
	level: NotificationLevel;
	/** Stays in to-do lists until resolvedAt is set. */
	actionRequired: boolean;
	title: string;
	body: string | null;
	/** Admin path the notification opens. */
	href: string | null;
	data: Record<string, unknown>;
	/** The person whose action caused it, when there was one. */
	actor: RequestUser | null;
	/** The agent that acted, for actor or the system. */
	actorAgent: AgentActor | null;
	readAt: string | null;
	archivedAt: string | null;
	resolvedAt: string | null;
	createdAt: string | null;
	updatedAt: string | null;
};

export type NotificationSummary = {
	unread: number;
	actionRequired: number;
	/** When the inbox last changed, so clients can skip refetching the list. */
	latestUpdatedAt: string | null;
};

export type NotificationAudienceSummary =
	| "recipients"
	| {
			permission: string;
			/** Roles chosen instead of the permission. Null means everyone with the permission. */
			roleIds: number[] | null;
	  };

/** A registered type with its current settings. */
export type NotificationType = {
	key: string;
	name: string;
	description: string | null;
	category: NotificationCategorySummary;
	level: NotificationLevel;
	actionRequired: boolean;
	/** Always delivered in-app; only its emails can be turned off. */
	required: boolean;
	audience: NotificationAudienceSummary;
	enabled: boolean;
	email: boolean;
	defaults: {
		enabled: boolean;
		email: boolean;
	};
};

/** A person's email choice for one type. Types that are turned off are left out. */
export type NotificationPreference = {
	type: string;
	name: string;
	description: string | null;
	category: NotificationCategorySummary;
	/** False when an admin turned the type's emails off for everyone. */
	emailAvailable: boolean;
	email: boolean;
};
