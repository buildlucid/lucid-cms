import { resolveKey } from "@lucidcms/core/kv-adapter";
import type {
	KVAdapterInstance,
	KVKeyOptions,
	KVSetOptions,
} from "@lucidcms/core/types";
import { Redis } from "ioredis";
import type { PluginOptions } from "./types.js";

const MAX_KEY_BYTES = 512;

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
		get: async <R>(
			key: string,
			kvOptions?: KVKeyOptions,
		): Promise<R | null> => {
			const resolvedKey = resolveKey(key, kvOptions, MAX_KEY_BYTES);
			const value = await client.get(resolvedKey);
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
			const resolvedKey = resolveKey(key, kvOptions, MAX_KEY_BYTES);
			const serialised =
				typeof value === "string" ? value : JSON.stringify(value);

			if (kvOptions?.expirationTtl) {
				await client.setex(resolvedKey, kvOptions.expirationTtl, serialised);
			} else if (kvOptions?.expirationTimestamp) {
				await client.set(
					resolvedKey,
					serialised,
					"EXAT",
					kvOptions.expirationTimestamp,
				);
			} else {
				await client.set(resolvedKey, serialised);
			}
		},
		has: async (key: string, kvOptions?: KVKeyOptions): Promise<boolean> => {
			const resolvedKey = resolveKey(key, kvOptions, MAX_KEY_BYTES);
			const exists = await client.exists(resolvedKey);
			return exists === 1;
		},
		delete: async (key: string, kvOptions?: KVKeyOptions): Promise<void> => {
			const resolvedKey = resolveKey(key, kvOptions, MAX_KEY_BYTES);
			await client.del(resolvedKey);
		},
		clear: async (): Promise<void> => {
			await client.flushdb();
		},
	};
};

export default redisKVAdapter;
