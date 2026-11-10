import type { PermissionRequirement } from "@lucidcms/types";
import type { Component } from "solid-js";
import type { AdminComponentReference, AdminOptions } from "./config.js";
import type { AdminRouteNavigation } from "./navigation.js";
import type { SlotOptions } from "./slot.js";

export type AdminRoute = {
	key: string;
	/** Static path, for example pages/reports. Link to it with `adminHref` from @lucidcms/admin/utils. */
	path: string;
	/** Component module. Its directory and subdirectories are scanned for Tailwind classes. */
	component: AdminComponentReference;
	options?: AdminOptions;
	/** Omit to keep this route out of the sidebar. */
	navigation?: AdminRouteNavigation;
} & (
	| {
			/** Renders inside the admin navigation. This is the default. Compose
			 * the page itself with PageLayout from @lucidcms/admin/components. */
			shell?: "navigation";
			access?: "authenticated";
			/** Hides the link and blocks the route for users without access. */
			permission?: PermissionRequirement;
	  }
	| {
			/** Renders on its own, with no navigation around it. */
			shell: "none";
			access?: "authenticated";
			/** Hides the link and blocks the route for users without access. */
			permission?: PermissionRequirement;
	  }
	| {
			shell: "none";
			/** Public routes also work when signed in. */
			access: "public";
	  }
);

/**
 * Types a route component from its definition, so `options` follows the registration.
 *
 * @example
 * ```tsx
 * import type { RouteComponent } from "@lucidcms/admin/types";
 * import type reportsRoute from "./config.js";
 *
 * const Reports: RouteComponent<typeof reportsRoute> = (props) => <p>{props.options.title}</p>;
 * ```
 */
export type RouteComponent<
	TConfig extends { options?: AdminOptions } = { options?: AdminOptions },
> = Component<{ readonly options: SlotOptions<TConfig> }>;
