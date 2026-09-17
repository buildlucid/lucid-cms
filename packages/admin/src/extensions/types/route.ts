import type { Component } from "solid-js";
import type { AdminModulePath } from "./config.js";
import type { AdminRouteNavigation } from "./navigation.js";

export type AdminRoute = {
	key: string;
	/** Static path relative to /lucid/e, for example pages/reports. */
	path: string;
	component: AdminModulePath;
	/** Omit to keep this route out of the sidebar. */
	navigation?: AdminRouteNavigation;
} & (
	| {
			/** Navigation and the standard content panel. This is the default. */
			layout?: "admin";
			access?: "authenticated";
	  }
	| {
			/** Full-page content without navigation, a panel or padding. */
			layout: "blank";
			/** Defaults to authenticated. Public routes also work when signed in. */
			access?: "authenticated" | "public";
	  }
);

export type AdminRouteComponent = Component;
