import type { AgentActor } from "../agent/types.js";
import type { UserDisplay } from "../users/types.js";

export type NotificationLevel = "info" | "success" | "warning" | "error";

/** Notification list filters, with `actionRequired` selecting notifications still awaiting the person's action. */
export type NotificationStatus =
	| "inbox"
	| "unread"
	| "actionRequired"
	| "archived";

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
	actor: UserDisplay | null;
	/** The agent that acted, for actor or the system. */
	actorAgent: AgentActor | null;
	readAt: string | null;
	archivedAt: string | null;
	resolvedAt: string | null;
	createdAt: string | null;
	updatedAt: string | null;
};

export type NotificationCounts = {
	unread: number;
	actionRequired: number;
	/** When the inbox last changed, so clients can skip refetching the list. */
	latestUpdatedAt: string | null;
};

/** Who receives a type: the recipients each notification names, or everyone with a permission. */
export type NotificationAudienceSummary =
	| { kind: "recipients" }
	| {
			kind: "permission";
			permission: string;
			/** Roles chosen instead of the permission. Null means everyone with the permission. */
			roleIds: number[] | null;
	  };

/** A registered type with its current settings. */
export type NotificationTypeSettings = {
	type: string;
	name: string;
	description: string | null;
	category: NotificationCategorySummary;
	level: NotificationLevel;
	actionRequired: boolean;
	/** Always delivered in-app, with only email delivery optional. */
	mandatory: boolean;
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
