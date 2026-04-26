import {
	DEFAULT_KV_NAMESPACE,
	getNamespacePrefix,
	resolveKey,
	resolveKeyInput,
} from "@lucidcms/core/kv";
import type {
	KVAdapterInstance,
	KVKeyInput,
	KVKeyOptions,
	KVSetInput,
	KVSetOptions,
} from "@lucidcms/core/types";
import type { PluginOptions } from "./types.js";
import getCloudflareKVExpirationTtl from "./utils/get-cloudflare-kv-expiration-ttl.js";
import parseKVValue from "./utils/parse-kv-value.js";
import serialiseKVValue from "./utils/serialise-kv-value.js";

const MAX_KEY_BYTES = 512;
const CLEAR_BATCH_SIZE = 100;

const cloudflareKVAdapter = (options: PluginOptions): KVAdapterInstance => {
	const namespace = options.namespace ?? DEFAULT_KV_NAMESPACE;
	const namespacePrefix = getNamespacePrefix(namespace);
	const resolveCloudflareKey = (key: string, keyOptions?: KVKeyOptions) =>
		resolveKey(key, keyOptions, { maxKeyBytes: MAX_KEY_BYTES, namespace });

	return {
		type: "kv-adapter",
		key: "cloudflare-kv",
		get: async <R>(
			key: string,
			kvOptions?: KVKeyOptions,
		): Promise<R | null> => {
			const resolvedKey = resolveCloudflareKey(key, kvOptions);
			const value = await options.binding.get(resolvedKey, { type: "text" });
			if (value === null) return null;

			return parseKVValue(value);
		},
		set: async (
			key: string,
			value: unknown,
			kvOptions?: KVSetOptions,
		): Promise<void> => {
			const resolvedKey = resolveCloudflareKey(key, kvOptions);
			const expirationTtl = getCloudflareKVExpirationTtl(kvOptions);

			await options.binding.put(resolvedKey, serialiseKVValue(value), {
				expirationTtl,
			});
		},
		has: async (key: string, kvOptions?: KVKeyOptions): Promise<boolean> => {
			const resolvedKey = resolveCloudflareKey(key, kvOptions);
			const value = await options.binding.get(resolvedKey, { type: "text" });
			return value !== null;
		},
		delete: async (key: string, kvOptions?: KVKeyOptions): Promise<void> => {
			const resolvedKey = resolveCloudflareKey(key, kvOptions);
			await options.binding.delete(resolvedKey);
		},
		getMany: async <R>(keys: KVKeyInput[], kvOptions?: KVKeyOptions) => {
			return Promise.all(
				keys.map(async (input) => {
					const resolved = resolveKeyInput(input, kvOptions);
					const value = await options.binding.get(
						resolveCloudflareKey(resolved.key, resolved.options),
						{ type: "text" },
					);

					return {
						key: resolved.key,
						value: value === null ? null : parseKVValue<R>(value),
					};
				}),
			);
		},
		setMany: async (items: Array<KVSetInput>, kvOptions?: KVSetOptions) => {
			await Promise.all(
				items.map((item) => {
					const itemOptions = {
						...(kvOptions ?? {}),
						...(item.options ?? {}),
					};
					const resolvedKey = resolveCloudflareKey(item.key, itemOptions);
					const expirationTtl = getCloudflareKVExpirationTtl(itemOptions);

					return options.binding.put(
						resolvedKey,
						serialiseKVValue(item.value),
						{ expirationTtl },
					);
				}),
			);
		},
		deleteMany: async (keys: KVKeyInput[], kvOptions?: KVKeyOptions) => {
			const resolvedKeys = keys.map((input) => {
				const resolved = resolveKeyInput(input, kvOptions);
				return resolveCloudflareKey(resolved.key, resolved.options);
			});

			for (let i = 0; i < resolvedKeys.length; i += CLEAR_BATCH_SIZE) {
				const batch = resolvedKeys.slice(i, i + CLEAR_BATCH_SIZE);
				await Promise.all(batch.map((key) => options.binding.delete(key)));
			}
		},
		clear: async (): Promise<void> => {
			let cursor: string | undefined;

			while (true) {
				const keys = cursor
					? await options.binding.list({
							cursor,
							prefix: namespacePrefix || undefined,
						})
					: await options.binding.list({
							prefix: namespacePrefix || undefined,
						});

				if (keys.keys.length > 0) {
					const resolvedKeys = keys.keys.map((key) => key.name);

					for (let i = 0; i < resolvedKeys.length; i += CLEAR_BATCH_SIZE) {
						const batch = resolvedKeys.slice(i, i + CLEAR_BATCH_SIZE);
						await Promise.all(batch.map((key) => options.binding.delete(key)));
					}
				}

				if (keys.list_complete) break;
				cursor = keys.cursor;
			}
		},
	};
};

export default cloudflareKVAdapter;
