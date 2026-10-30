import authenticate from "./middleware/authenticate.js";
import cache from "./middleware/cache.js";
import externalAuthentication from "./middleware/external-authenticate.js";
import externalScopes from "./middleware/external-scopes.js";
import permissions from "./middleware/permissions.js";
import rateLimiter from "./middleware/rate-limiter.js";
import validateCSRF from "./middleware/validate-csrf.js";
import validate from "./middleware/validate.js";

/**
 * Provides middleware factories for custom routes and plugins.
 * @remarks Call each factory when registering middleware, such as `middleware.authenticate()`.
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
	/** Requires a signed-in admin user and sets `auth` on the context. */
	authenticate,
	/** Caches successful JSON responses in KV. Personalised responses should use `bypass`. */
	cache,
	/** Authenticates external requests with an integration API key or OAuth access token, and sets `externalAuth` on the context. */
	externalAuthentication,
	/** Requires every given scope. Register external authentication first. */
	externalScopes,
	/** Requires the signed-in admin user to meet a permission requirement. Register authentication first. */
	permissions,
	/** Limits requests using the configured KV adapter, returning 429 with Retry-After when exceeded. */
	rateLimiter,
	/**
	 * Validates a request target with Zod and returns formatted Lucid validation errors.
	 * @remarks Prefer `defineRoute`'s `schema` for validation and OpenAPI documentation.
	 */
	validate,
	/** Checks the CSRF token for cookie-authenticated requests. Use alongside `authenticate`. */
	validateCSRF,
};
