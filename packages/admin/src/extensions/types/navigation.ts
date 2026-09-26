import type { ResolvedAdminCopy } from "@lucidcms/types";

export type AdminNavigationIcon =
	| "dashboard"
	| "agent"
	| "chat"
	| "history"
	| "routines"
	| "collection-multiple"
	| "collection-single"
	| "media"
	| "users"
	| "overview"
	| "roles"
	| "email"
	| "logout"
	| "queue"
	| "integrations"
	| "settings"
	| "release-requests"
	| "publishing"
	| "extensions";

/** Use an existing group key or define a group. */
export type AdminNavigationGroup =
	| string
	| {
			key: string;
			label?: string | ResolvedAdminCopy;
			/** Lower values appear first; unordered groups follow. */
			order?: number;
	  };

export type AdminRouteNavigation = {
	label: string | ResolvedAdminCopy;
	/** Omit to place the link under Extensions. */
	group?: AdminNavigationGroup;
	/** Lower values appear first; unordered links follow in registration order. */
	order?: number;
	/** Defaults to the extension icon. */
	icon?: AdminNavigationIcon;
};
