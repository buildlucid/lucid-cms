import { resolveKey } from "@lucidcms/core/kv-adapter";
import type {
	KVAdapterInstance,
	KVKeyOptions,
	KVSetOptions,
} from "@lucidcms/core/types";
import type { PluginOptions } from "./types.js";

const MILLISECONDS_PER_SECOND = 1000;
const MAX_KEY_BYTES = 512;

const cloudflareKVAdapter = (options: PluginOptions): KVAdapterInstance => {
	return {
		type: "kv-adapter",
		key: "cloudflare-kv",
		command: {
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
					expirationTtl = kvOptions.expirationTtl;
				} else if (kvOptions?.expirationTimestamp) {
					const nowSeconds = Math.floor(Date.now() / MILLISECONDS_PER_SECOND);
					expirationTtl = Math.max(
						0,
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
				const keys = await options.binding.list();
				await Promise.all(keys.keys.map((k) => options.binding.delete(k.name)));
			},
		},
	};
};

export default cloudflareKVAdapter;
