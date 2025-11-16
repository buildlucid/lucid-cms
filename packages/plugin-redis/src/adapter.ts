import type { KVAdapterInstance, KVSetOptions } from "@lucidcms/core/types";
import { Redis } from "ioredis";
import type { PluginOptions } from "./types.js";

const redisKVAdapter = (options: PluginOptions): KVAdapterInstance => {
	const client =
		typeof options.connection === "string"
			? new Redis(options.connection)
			: new Redis(options.connection);

	return {
		type: "kv-adapter",
		key: "redis",
		lifecycle: {
			destroy: async () => {
				await client.quit();
			},
		},
		command: {
			get: async <R>(key: string): Promise<R | null> => {
				const value = await client.get(key);
				if (value === null) return null;

				try {
					return JSON.parse(value) as R;
				} catch {
					return value as R;
				}
			},
			set: async (
				key: string,
				value: unknown,
				kvOptions?: KVSetOptions,
			): Promise<void> => {
				const serialised =
					typeof value === "string" ? value : JSON.stringify(value);

				if (kvOptions?.expirationTtl) {
					await client.setex(key, kvOptions.expirationTtl, serialised);
				} else if (kvOptions?.expirationTimestamp) {
					await client.set(
						key,
						serialised,
						"EXAT",
						kvOptions.expirationTimestamp,
					);
				} else {
					await client.set(key, serialised);
				}
			},
			has: async (key: string): Promise<boolean> => {
				const exists = await client.exists(key);
				return exists === 1;
			},
			delete: async (key: string): Promise<void> => {
				await client.del(key);
			},
			clear: async (): Promise<void> => {
				await client.flushdb();
			},
		},
	};
};

export default redisKVAdapter;
