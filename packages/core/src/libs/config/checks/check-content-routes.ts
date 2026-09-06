import type { ResolvedLucidConfig } from "../../../types/config.js";
import { isContentRouteDefinition } from "../../http/define-content-api-route.js";
import { getRouteKey, getRoutePath } from "../../http/utils/route-identity.js";
import { getInvalidExternalScopes } from "../../permission/scopes.js";

/** Checks route uniqueness and static content-route scopes. */
const checkContentRoutes = (config: ResolvedLucidConfig) => {
	const identities = new Set<string>();
	for (const route of config.http.routes) {
		const routePath = getRoutePath(route);
		const identity = getRouteKey({ method: route.method, path: routePath });
		if (identities.has(identity))
			throw new Error(
				`Route "${route.method.toUpperCase()} ${routePath}" is already registered.`,
			);
		identities.add(identity);
		if (!isContentRouteDefinition(route)) continue;
		if (route.access.type !== "scoped") continue;
		if (typeof route.access.scopes === "function") continue;

		const invalidScopes = getInvalidExternalScopes(
			config,
			route.access.scopes,
			{ principalType: route.access.principalType },
		);
		if (invalidScopes.length > 0) {
			throw new Error(
				`Content route "${route.method.toUpperCase()} ${route.path}" uses unavailable scopes: ${invalidScopes.join(", ")}.`,
			);
		}
	}
};

export default checkContentRoutes;
