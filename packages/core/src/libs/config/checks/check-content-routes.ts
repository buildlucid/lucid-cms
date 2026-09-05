import type { Config } from "../../../types/config.js";
import { isContentRouteDefinition } from "../../http/define-content-api-route.js";
import { getInvalidExternalScopes } from "../../permission/scopes.js";

/** Checks static content-route scopes against the configured capability registry. */
const checkContentRoutes = (config: Config) => {
	for (const route of config.http.routes) {
		if (!isContentRouteDefinition(route)) continue;
		if (route.access.type !== "scoped") continue;
		if (typeof route.access.scopes === "function") continue;

		const invalidScopes = getInvalidExternalScopes(
			config.collections,
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
