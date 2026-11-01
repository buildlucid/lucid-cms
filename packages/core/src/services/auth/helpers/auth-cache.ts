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

/** Invalidates auth caches after commit so concurrent requests cannot cache uncommitted state. */
export const invalidateAuthCache = (context: ServiceContext) =>
	context.db.afterCommit(() => invalidateNamespace(context, AUTH_NAMESPACE));
