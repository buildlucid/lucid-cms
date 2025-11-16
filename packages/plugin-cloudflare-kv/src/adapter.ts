import type { KVAdapterInstance, KVSetOptions } from "@lucidcms/core/types";
import type { PluginOptions } from "./types.js";

const MILLISECONDS_PER_SECOND = 1000;

const cloudflareKVAdapter = (options: PluginOptions): KVAdapterInstance => {
	return {
		type: "kv-adapter",
		key: "cloudflare-kv",
		command: {
			get: async <R>(key: string): Promise<R | null> => {
				const value = await options.namespace.get(key, { type: "text" });
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

				await options.namespace.put(key, serialised, {
					expirationTtl,
				});
			},
			has: async (key: string): Promise<boolean> => {
				const value = await options.namespace.get(key, { type: "text" });
				return value !== null;
			},
			delete: async (key: string): Promise<void> => {
				await options.namespace.delete(key);
			},
			clear: async (): Promise<void> => {
				const keys = await options.namespace.list();
				await Promise.all(
					keys.keys.map((k) => options.namespace.delete(k.name)),
				);
			},
		},
	};
};

export default cloudflareKVAdapter;
