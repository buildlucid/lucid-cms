import type { ResolvedAdminCopy } from "@lucidcms/types";

/** Named icons already available in the admin sidebar. */
export type AdminNavigationIcon =
	| "dashboard"
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

/** Shares group keys with collection navigation. */
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
