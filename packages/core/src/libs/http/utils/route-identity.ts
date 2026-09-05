import { splitRoutingPath } from "hono/utils/url";
import constants from "../../../constants/constants.js";
import { isContentRouteDefinition } from "../define-content-api-route.js";
import type { LucidCustomRouteDefinition } from "../types.js";

const contentRoutePrefix = `/${constants.directories.base}/api/v1/content`;

/** Ignores parameter names while preserving regex constraints and optionality. */
export const getRouteKey = (route: { method: string; path: string }) =>
	`${route.method.toUpperCase()}:${splitRoutingPath(route.path)
		.map((segment) => segment.replace(/^:[^{?]+/, ":param"))
		.join("/")}`;

export const getRoutePath = (route: LucidCustomRouteDefinition) => {
	if (!isContentRouteDefinition(route)) return route.path;
	return route.path === "/"
		? contentRoutePrefix
		: `${contentRoutePrefix}${route.path}`;
};
