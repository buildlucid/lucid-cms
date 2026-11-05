import { apiMountPath } from "./constants.js";

const cacheMs = 30_000;

const caches = new WeakMap<
	Window,
	Map<string, { expiresAt: number; promise: Promise<boolean> }>
>();

const checkAuthentication = async (
	targetWindow: Window,
	host: URL,
): Promise<boolean> => {
	const response = await targetWindow.fetch(
		new URL(`${apiMountPath}/v1/auth/status`, host),
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

/** Whether the visitor is signed in to the CMS, checked once per CMS origin every 30 seconds. */
export const isSignedIn = (
	targetWindow: Window,
	host: URL,
): Promise<boolean> => {
	let cache = caches.get(targetWindow);
	if (!cache) {
		cache = new Map();
		caches.set(targetWindow, cache);
	}

	const cached = cache.get(host.origin);
	if (cached && cached.expiresAt > Date.now()) return cached.promise;

	const entry = {
		expiresAt: Date.now() + cacheMs,
		promise: checkAuthentication(targetWindow, host).catch(() => false),
	};
	cache.set(host.origin, entry);
	return entry.promise;
};
