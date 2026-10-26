import type { LucidHost } from "@lucidcms/core/types";

type HostCreation = {
	startedAt: number;
	error?: unknown;
};

/** Stable cache keys for the HTTP and background Worker hosts. */
export const runtimeHostKeys = {
	http: "lucid:http",
	background: "lucid:background",
} as const;

/** Caches completed Lucid hosts while the initializing request owns its promise and concurrent requests poll settled state, avoiding another Worker request's I/O-bearing promise. */
const createHostCache = () => {
	const hosts = new Map<string, LucidHost>();
	const creations = new Map<string, HostCreation>();
	let destroyed = false;

	const get = async (
		key: string,
		create: () => Promise<LucidHost>,
		anchor?: (promise: Promise<unknown>) => void,
	): Promise<LucidHost> => {
		const existing = hosts.get(key);
		if (existing) return existing;

		let creation = creations.get(key);
		if (!creation) {
			creation = { startedAt: Date.now() };
			creations.set(key, creation);
			const currentCreation = creation;
			const task = create()
				.then(async (host) => {
					if (destroyed) {
						await host.destroy();
						throw new Error("The Lucid host was destroyed while it started.");
					}

					const initialized = hosts.get(key);
					if (initialized) {
						await host.destroy();
						return initialized;
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
			if (initialized) return initialized;
			if (creation.error !== undefined) {
				if (creations.get(key) === creation) creations.delete(key);
				throw creation.error;
			}
			await new Promise((resolve) => setTimeout(resolve, pollDelay));
			pollDelay = Math.min(pollDelay * 2, 25);
		}

		if (creations.get(key) === creation) creations.delete(key);
		return get(key, create, anchor);
	};

	return {
		get,
		/** Destroys the cached hosts, and any that finish starting afterwards. */
		destroy: async () => {
			destroyed = true;
			const current = Array.from(hosts.values());
			hosts.clear();
			await Promise.allSettled(current.map((host) => host.destroy()));
		},
	};
};

export type HostCache = ReturnType<typeof createHostCache>;

export default createHostCache;
