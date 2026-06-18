import { createMiddleware } from "hono/factory";
import constants from "../../../constants/constants.js";
import { getAuthCacheNamespaceToken } from "../../../services/auth/helpers/auth-cache.js";
import { authServices } from "../../../services/index.js";
import type {
	LucidAccessToken,
	LucidAuth,
	LucidHonoContext,
} from "../../../types/hono.js";
import { LucidAPIError } from "../../../utils/errors/index.js";
import { multiTenancyEnabled } from "../../../utils/helpers/index.js";
import formatter, { userPermissionsFormatter } from "../../formatters/index.js";
import { copy } from "../../i18n/index.js";
import cacheKeys from "../../kv/cache-keys.js";
import { UsersRepository } from "../../repositories/index.js";

type TenantScope = "required" | "allow-global";

/**
 * Controls whether a route must be scoped to a tenant.
 * Use `allow-global` for routes that need to work before or outside tenant selection.
 */
type AuthenticateOptions = {
	tenantScope?: TenantScope;
};

type CachedAuthState = Omit<LucidAuth, "exp" | "iat" | "nonce">;

/**
 * Reads the cached live auth state for a user.
 * The namespace token lets us invalidate all user auth cache entries at once.
 */
const getCachedAuthState = async (
	c: LucidHonoContext,
	token: LucidAccessToken,
	tenantKey?: string | null,
) => {
	const namespaceToken = await getAuthCacheNamespaceToken(c.get("kv"));
	const cacheKey = cacheKeys.auth.user(token.id, namespaceToken, tenantKey);

	return {
		cacheKey,
		data: await c.get("kv").get<CachedAuthState>(cacheKey, { hash: true }),
	};
};

/**
 * Loads the current user auth state from the database.
 * Access tokens only prove identity; permissions and tenants come from live user data.
 */
const fetchAuthState = async (
	c: LucidHonoContext,
	token: LucidAccessToken,
	tenantKey?: string | null,
): Promise<CachedAuthState> => {
	const config = c.get("config");
	const Users = new UsersRepository(config.db.client, config.db);

	const userRes = await Users.selectAccessTokenUser({
		where: [
			{ key: "id", operator: "=", value: token.id },
			{
				key: "is_deleted",
				operator: "=",
				value: config.db.getDefault("boolean", "false"),
			},
			{
				key: "is_locked",
				operator: "=",
				value: config.db.getDefault("boolean", "false"),
			},
		],
		tenantKey,
		validation: {
			enabled: true,
			defaultError: {
				type: "authorisation",
				code: "authorisation",
				message: copy("server:core.permissions.unauthorized"),
				status: 401,
			},
		},
	});
	if (userRes.error) throw new LucidAPIError(userRes.error);

	const superAdmin = formatter.formatBoolean(userRes.data.super_admin ?? false);

	const { permissions } = userPermissionsFormatter.formatMultiple({
		roles: userRes.data.roles || [],
		defaultLocale: config.localization.defaultLocale,
	});

	return {
		id: userRes.data.id,
		username: userRes.data.username,
		email: userRes.data.email,
		permissions,
		superAdmin,
		tenantKeys: superAdmin
			? config.tenants.map((tenant) => tenant.key)
			: (userRes.data.tenants ?? []).map((tenant) => tenant.tenant_key),
	};
};

/**
 * Resolves the auth context used by the request.
 * Cached data keeps auth fast while still allowing permission changes to take effect quickly.
 */
const resolveAuthState = async (
	c: LucidHonoContext,
	token: LucidAccessToken,
	tenantKey?: string | null,
): Promise<LucidAuth> => {
	const cached = await getCachedAuthState(c, token, tenantKey);
	const authState = cached.data ?? (await fetchAuthState(c, token, tenantKey));

	if (cached.data == null) {
		await c.get("kv").set(cached.cacheKey, authState, {
			expirationTtl: constants.authCacheExpiration,
			hash: true,
		});
	}

	return {
		...authState,
		exp: token.exp,
		iat: token.iat,
		nonce: token.nonce,
	};
};

/**
 * Verifies the access token and stores the current auth state in Hono context.
 * Soft mode is used by optional auth paths where anonymous requests are allowed.
 */
export const authenticationCheck = async (
	c: LucidHonoContext,
	options?: { soft?: boolean; tenantKey?: string | null },
) => {
	const accessTokenRes = await authServices.accessToken.verifyToken(c);
	if (accessTokenRes.error) {
		if (options?.soft !== true) throw new LucidAPIError(accessTokenRes.error);
		return;
	}
	if (!accessTokenRes.data) return;

	try {
		c.set(
			"auth",
			await resolveAuthState(c, accessTokenRes.data, options?.tenantKey),
		);
	} catch (error) {
		if (options?.soft === true) return;
		throw error;
	}
};

/**
 * Determines the tenant key that should scope auth permissions.
 * Full tenant access validation still happens after auth is loaded.
 */
const resolveAuthTenantKey = (c: LucidHonoContext) => {
	const config = c.get("config");
	if (!multiTenancyEnabled(config)) return null;

	const tenantKey = c.req.header(constants.headers.tenant);
	if (!tenantKey) return null;

	return config.tenants.some((tenant) => tenant.key === tenantKey)
		? tenantKey
		: null;
};

/**
 * Resolves the request tenant after authentication.
 * Tenant membership is checked against the live auth state, not the access token.
 */
const resolveTenantCheck = (
	c: LucidHonoContext,
	options?: AuthenticateOptions,
) => {
	const config = c.get("config");
	if (!multiTenancyEnabled(config)) {
		c.set("tenant", null);
		return;
	}

	const tenantKey = c.req.header(constants.headers.tenant);
	const auth = c.get("auth");
	if (!tenantKey) {
		if (options?.tenantScope === "allow-global" || auth.superAdmin) {
			c.set("tenant", null);
			return;
		}

		throw new LucidAPIError({
			type: "authorisation",
			message: copy("server:core.tenants.no.access"),
			status: 403,
		});
	}

	const tenantExists = config.tenants.some(
		(tenant) => tenant.key === tenantKey,
	);
	if (!tenantExists) {
		throw new LucidAPIError({
			type: "basic",
			message: copy("server:core.tenants.unknown", {
				data: { key: tenantKey },
			}),
			status: 400,
		});
	}

	if (!auth.superAdmin && !auth.tenantKeys.includes(tenantKey)) {
		throw new LucidAPIError({
			type: "authorisation",
			message: copy("server:core.tenants.no.access"),
			status: 403,
		});
	}

	c.set("tenant", { key: tenantKey });
};

/**
 * Authenticates an admin request and, by default, requires a tenant when tenancy is enabled.
 * Pass `tenantScope: "allow-global"` for global routes such as account/bootstrap data.
 */
const authenticate = (options?: AuthenticateOptions) =>
	createMiddleware(async (c: LucidHonoContext, next) => {
		await authenticationCheck(c, { tenantKey: resolveAuthTenantKey(c) });
		resolveTenantCheck(c, options);
		return await next();
	});

export default authenticate;
