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
};

export type AdminRouteComponent = Component;
