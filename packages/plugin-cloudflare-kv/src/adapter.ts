import { resolveKey } from "@lucidcms/core/kv-adapter";
import type {
	KVAdapterInstance,
	KVKeyOptions,
	KVSetOptions,
} from "@lucidcms/core/types";
import type { PluginOptions } from "./types.js";

const MILLISECONDS_PER_SECOND = 1000;
const MAX_KEY_BYTES = 512;
const MIN_TTL_SECONDS = 60;
const CLEAR_BATCH_SIZE = 100;

const cloudflareKVAdapter = (options: PluginOptions): KVAdapterInstance => {
	return {
		type: "kv-adapter",
		key: "cloudflare-kv",
		get: async <R>(
			key: string,
			kvOptions?: KVKeyOptions,
		): Promise<R | null> => {
			const resolvedKey = resolveKey(key, kvOptions, MAX_KEY_BYTES);
			const value = await options.binding.get(resolvedKey, { type: "text" });
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

			let expirationTtl: number | undefined;

			if (kvOptions?.expirationTtl) {
				expirationTtl = Math.max(MIN_TTL_SECONDS, kvOptions.expirationTtl);
			} else if (kvOptions?.expirationTimestamp) {
				const nowSeconds = Math.floor(Date.now() / MILLISECONDS_PER_SECOND);
				expirationTtl = Math.max(
					MIN_TTL_SECONDS,
					kvOptions.expirationTimestamp - nowSeconds,
				);
			}

			await options.binding.put(resolvedKey, serialised, {
				expirationTtl,
			});
		},
		has: async (key: string, kvOptions?: KVKeyOptions): Promise<boolean> => {
			const resolvedKey = resolveKey(key, kvOptions, MAX_KEY_BYTES);
			const value = await options.binding.get(resolvedKey, { type: "text" });
			return value !== null;
		},
		delete: async (key: string, kvOptions?: KVKeyOptions): Promise<void> => {
			const resolvedKey = resolveKey(key, kvOptions, MAX_KEY_BYTES);
			await options.binding.delete(resolvedKey);
		},
		clear: async (): Promise<void> => {
			let cursor: string | undefined;

			while (true) {
				const keys = cursor
					? await options.binding.list({ cursor })
					: await options.binding.list();

				if (keys.keys.length > 0) {
					for (let i = 0; i < keys.keys.length; i += CLEAR_BATCH_SIZE) {
						const batch = keys.keys.slice(i, i + CLEAR_BATCH_SIZE);
						await Promise.all(
							batch.map((key) => options.binding.delete(key.name)),
						);
					}
				}

				if (keys.list_complete) break;
				cursor = keys.cursor;
			}
		},
	};
};

export default cloudflareKVAdapter;
