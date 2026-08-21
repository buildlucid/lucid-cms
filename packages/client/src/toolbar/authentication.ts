import { lucidMountPath } from "./constants.js";
import type { ToolbarAuthentication } from "./types.js";

const authenticationCacheTtlMs = 30_000;

type AuthenticationCacheEntry = {
	expiresAt: number;
	promise: Promise<boolean>;
};

const authenticationCaches = new WeakMap<
	Window,
	Map<string, AuthenticationCacheEntry>
>();

/** Parses declarative toolbar authentication state. */
export const parseToolbarAuthentication = (
	value: string | null | undefined,
): ToolbarAuthentication => {
	switch (value?.trim().toLowerCase()) {
		case "authenticated":
			return true;
		case "unauthenticated":
			return false;
		default:
			return "auto";
	}
};

const checkToolbarAuthentication = async (
	targetWindow: Window,
	host: URL,
): Promise<boolean> => {
	const response = await targetWindow.fetch(
		new URL(`${lucidMountPath}/api/v1/auth/status`, host),
		{
			credentials: "include",
			headers: { Accept: "application/json" },
			referrerPolicy: "no-referrer",
		},
	);
	if (response.status === 204) return true;
	if (response.status === 401) return false;
	throw new Error(`Lucid authentication check failed with ${response.status}.`);
};

const resolveAutomaticAuthentication = (
	targetWindow: Window,
	host: URL,
): Promise<boolean> => {
	let cache = authenticationCaches.get(targetWindow);
	if (!cache) {
		cache = new Map();
		authenticationCaches.set(targetWindow, cache);
	}

	const key = host.origin;
	const cached = cache.get(key);
	if (cached && cached.expiresAt > Date.now()) return cached.promise;

	const entry: AuthenticationCacheEntry = {
		expiresAt: Date.now() + authenticationCacheTtlMs,
		promise: checkToolbarAuthentication(targetWindow, host),
	};
	cache.set(key, entry);
	void entry.promise.catch(() => {
		if (cache.get(key) === entry) cache.delete(key);
	});
	return entry.promise;
};

/** Resolves automatic, settled, or application-owned authentication state. */
export const resolveToolbarAuthentication = async (
	targetWindow: Window,
	host: URL,
	authentication: ToolbarAuthentication = "auto",
): Promise<boolean> => {
	if (typeof authentication === "boolean") {
		return authentication;
	}
	if (typeof authentication === "function") {
		return authentication();
	}
	return resolveAutomaticAuthentication(targetWindow, host);
};
