import {
	getNamespaceToken,
	invalidateNamespace,
} from "../../../libs/kv/namespaces.js";
import type { ServiceContext } from "../../../utils/services/types.js";

const AUTH_NAMESPACE = "auth:user";

/**
 * Returns the current auth cache namespace token.
 * User auth cache keys include this token so one namespace update invalidates every entry.
 */
export const getAuthCacheNamespaceToken = (context: ServiceContext) =>
	getNamespaceToken(context, AUTH_NAMESPACE);

/**
 * Invalidates cached user auth state across the app.
 * Used after role, permission, tenant, or user status changes.
 */
export const invalidateAuthCache = (context: ServiceContext) =>
	invalidateNamespace(context, AUTH_NAMESPACE);
