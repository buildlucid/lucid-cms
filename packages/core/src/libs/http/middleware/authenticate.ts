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
import formatter, { userPermissionsFormatter } from "../../formatters/index.js";
import { copy } from "../../i18n/index.js";
import cacheKeys from "../../kv/cache-keys.js";
import { UsersRepository } from "../../repositories/index.js";
import createServiceContext from "../utils/create-service-context.js";

type CachedAuthState = Omit<LucidAuth, "exp" | "iat" | "nonce">;

/**
 * Reads the cached live auth state for a user.
 * The namespace token lets us invalidate all user auth cache entries at once.
 */
const getCachedAuthState = async (
	c: LucidHonoContext,
	token: LucidAccessToken,
) => {
	const context = createServiceContext(c);
	const namespaceToken = await getAuthCacheNamespaceToken(context);
	const cacheKey = cacheKeys.auth.user(token.id, namespaceToken);

	return {
		cacheKey,
		context,
		data: await context.kv.get<CachedAuthState>(context, {
			key: cacheKey,
			hash: true,
		}),
	};
};

/**
 * Loads the current user auth state from the database.
 * Access tokens only prove identity; permissions come from live user data.
 */
const fetchAuthState = async (
	c: LucidHonoContext,
	token: LucidAccessToken,
): Promise<CachedAuthState> => {
	const config = c.get("config");
	const Users = new UsersRepository(c.get("database").client, config.db);

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
	};
};

/**
 * Resolves the auth context used by the request.
 * Cached data keeps auth fast while still allowing permission changes to take effect quickly.
 */
const resolveAuthState = async (
	c: LucidHonoContext,
	token: LucidAccessToken,
): Promise<LucidAuth> => {
	const cached = await getCachedAuthState(c, token);
	const authState = cached.data ?? (await fetchAuthState(c, token));

	if (cached.data == null) {
		await cached.context.kv.set(cached.context, {
			key: cached.cacheKey,
			value: authState,
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
	options?: { soft?: boolean },
) => {
	const accessTokenRes = await authServices.accessToken.verifyToken(c);
	if (accessTokenRes.error) {
		if (options?.soft !== true) throw new LucidAPIError(accessTokenRes.error);
		return;
	}
	if (!accessTokenRes.data) return;

	try {
		c.set("auth", await resolveAuthState(c, accessTokenRes.data));
	} catch (error) {
		if (options?.soft === true) return;
		throw error;
	}
};

/**
 * Authenticates an admin request.
 */
const authenticate = () =>
	createMiddleware(async (c: LucidHonoContext, next) => {
		await authenticationCheck(c);
		return await next();
	});

export default authenticate;
