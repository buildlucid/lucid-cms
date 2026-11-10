import { splitRoutingPath } from "hono/utils/url";
import constants from "../../../constants/constants.js";
import { isContentRouteDefinition } from "../define-content-api-route.js";
import type { LucidCustomRouteDefinition } from "../types.js";

//* custom content routes have their own prefix so endpoints core adds later can never clash with a project's
const contentRoutePrefix = `${constants.paths.api}/v1/content/e`;

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
