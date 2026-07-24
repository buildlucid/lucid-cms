import type { LucidHost } from "@lucidcms/core/types";

type HostCreation = {
	startedAt: number;
	error?: unknown;
};

const hosts = new Map<unknown, LucidHost>();
const creations = new Map<unknown, HostCreation>();

/** Stable cache keys for the HTTP and background Worker hosts. */
export const runtimeHostKeys = {
	http: "lucid:http",
	background: "lucid:background",
} as const;

/**
 * Caches only completed Lucid hosts in Worker module state. The request that
 * starts initialization owns its promise; concurrent requests poll settled
 * state so they never await an I/O-bearing promise created by another request.
 */
const getOrCreateRuntimeHost = async <Host extends LucidHost>(
	key: unknown,
	create: () => Host | Promise<Host>,
	anchor?: (promise: Promise<unknown>) => void,
): Promise<Host> => {
	const existing = hosts.get(key);
	if (existing) return existing as Host;

	let creation = creations.get(key);
	if (!creation) {
		creation = { startedAt: Date.now() };
		creations.set(key, creation);
		const currentCreation = creation;
		const task = Promise.resolve()
			.then(create)
			.then(async (host) => {
				const initialized = hosts.get(key);
				if (initialized) {
					await host.destroy();
					return initialized as Host;
				}
				hosts.set(key, host);
				creations.delete(key);
				return host;
			})
			.catch((error) => {
				currentCreation.error = error;
				if (creations.get(key) === currentCreation) creations.delete(key);
				throw error;
			});

		try {
			anchor?.(task);
		} catch {
			// The creating request still owns and awaits initialization.
		}
		return task;
	}

	const deadline = creation.startedAt + 30_000;
	let pollDelay = 1;
	while (Date.now() < deadline) {
		const initialized = hosts.get(key);
		if (initialized) return initialized as Host;
		if (creation.error !== undefined) {
			if (creations.get(key) === creation) creations.delete(key);
			throw creation.error;
		}
		await new Promise((resolve) => setTimeout(resolve, pollDelay));
		pollDelay = Math.min(pollDelay * 2, 25);
	}

	if (creations.get(key) === creation) creations.delete(key);
	return getOrCreateRuntimeHost(key, create, anchor);
};

export default getOrCreateRuntimeHost;
