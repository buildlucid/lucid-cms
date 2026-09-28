import authenticate from "./middleware/authenticate.js";
import authorizePrivateMedia from "./middleware/authorize-private-media.js";
import cache from "./middleware/cache.js";
import externalAuthentication from "./middleware/external-authenticate.js";
import externalScopes from "./middleware/external-scopes.js";
import logRoute from "./middleware/log-route.js";
import permissions from "./middleware/permissions.js";
import rateLimiter from "./middleware/rate-limiter.js";
import validate from "./middleware/validate.js";
import validateCSRF from "./middleware/validate-csrf.js";

/**
 * Lucid's route middleware, for custom routes and plugins.
 *
 * @example
 * ```ts
 * defineRoute({
 * 	method: "get",
 * 	path: "/downloads/:key",
 * 	middleware: [middleware.rateLimiter({ mode: "ip", scope: "downloads", limit: 60, windowMs: 60_000 })],
 * 	handler: async () => {},
 * });
 * ```
 */
export const middleware = {
	authenticate,
	/** Requires admin authentication for private media keys. Public keys pass through. */
	authorizePrivateMedia,
	/** Caches successful JSON responses in KV. Personalised responses should use `bypass`. */
	cache,
	/** Authenticates external requests with an integration API key or OAuth access token. */
	externalAuthentication,
	/** Requires every given scope. Register external authentication first. */
	externalScopes,
	logRoute,
	/** Requires the signed-in admin user to meet a permission requirement. Register authentication first. */
	permissions,
	/** Limits requests using the configured KV adapter, returning 429 with Retry-After when exceeded. */
	rateLimiter,
	/** Validates a request target with Zod, raising a formatted Lucid validation error. */
	validate,
	/** Checks the CSRF token for cookie-authenticated requests. Use alongside `authenticate`. */
	validateCSRF,
};
