import type { PermissionRequirement } from "@lucidcms/types";
import type { Component } from "solid-js";
import type { AdminComponentReference, AdminOptions } from "./config.js";
import type { AdminRouteNavigation } from "./navigation.js";

export type AdminRoute = {
	key: string;
	/** Static path relative to /lucid/e, for example pages/reports. */
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

export type RouteComponent<
	TOptions extends AdminOptions | undefined = undefined,
> = Component<{ readonly options: TOptions }>;
