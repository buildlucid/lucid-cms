import {
	getNamespaceToken,
	invalidateNamespace,
} from "../../../libs/kv/namespaces.js";
import type { KVAdapterInstance } from "../../../libs/kv/types.js";

const AUTH_NAMESPACE = "auth:user";

/**
 * Returns the current auth cache namespace token.
 * User auth cache keys include this token so one namespace update invalidates every entry.
 */
export const getAuthCacheNamespaceToken = (kv: KVAdapterInstance) =>
	getNamespaceToken(kv, AUTH_NAMESPACE);

/**
 * Invalidates cached user auth state across the app.
 * Used after role, permission, tenant, or user status changes.
 */
export const invalidateAuthCache = (kv: KVAdapterInstance) =>
	invalidateNamespace(kv, AUTH_NAMESPACE);
