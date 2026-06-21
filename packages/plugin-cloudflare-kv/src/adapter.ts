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
	ServiceContext,
} from "@lucidcms/core/types";
import type { PluginOptions } from "./types.js";
import getCloudflareKVExpirationTtl from "./utils/get-cloudflare-kv-expiration-ttl.js";
import parseKVValue from "./utils/parse-kv-value.js";
import { resolveBinding } from "./utils/resolve-binding.js";
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
			context: ServiceContext,
			key: string,
			kvOptions?: KVKeyOptions,
		): Promise<R | null> => {
			const resolvedKey = resolveCloudflareKey(key, kvOptions);
			const binding = resolveBinding(context, options);
			const value = await binding.get(resolvedKey, { type: "text" });
			if (value === null) return null;

			return parseKVValue(value);
		},
		set: async (
			context,
			key: string,
			value: unknown,
			kvOptions?: KVSetOptions,
		): Promise<void> => {
			const resolvedKey = resolveCloudflareKey(key, kvOptions);
			const expirationTtl = getCloudflareKVExpirationTtl(kvOptions);
			const binding = resolveBinding(context, options);

			await binding.put(resolvedKey, serialiseKVValue(value), {
				expirationTtl,
			});
		},
		has: async (
			context: ServiceContext,
			key: string,
			kvOptions?: KVKeyOptions,
		): Promise<boolean> => {
			const resolvedKey = resolveCloudflareKey(key, kvOptions);
			const binding = resolveBinding(context, options);
			const value = await binding.get(resolvedKey, { type: "text" });
			return value !== null;
		},
		delete: async (
			context: ServiceContext,
			key: string,
			kvOptions?: KVKeyOptions,
		): Promise<void> => {
			const resolvedKey = resolveCloudflareKey(key, kvOptions);
			const binding = resolveBinding(context, options);
			await binding.delete(resolvedKey);
		},
		getMany: async <R>(
			context: ServiceContext,
			keys: KVKeyInput[],
			kvOptions?: KVKeyOptions,
		) => {
			const binding = resolveBinding(context, options);

			return Promise.all(
				keys.map(async (input) => {
					const resolved = resolveKeyInput(input, kvOptions);
					const value = await binding.get(
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
		setMany: async (
			context,
			items: Array<KVSetInput>,
			kvOptions?: KVSetOptions,
		) => {
			const binding = resolveBinding(context, options);
			await Promise.all(
				items.map((item) => {
					const itemOptions = {
						...(kvOptions ?? {}),
						...(item.options ?? {}),
					};
					const resolvedKey = resolveCloudflareKey(item.key, itemOptions);
					const expirationTtl = getCloudflareKVExpirationTtl(itemOptions);

					return binding.put(resolvedKey, serialiseKVValue(item.value), {
						expirationTtl,
					});
				}),
			);
		},
		deleteMany: async (
			context,
			keys: KVKeyInput[],
			kvOptions?: KVKeyOptions,
		) => {
			const resolvedKeys = keys.map((input) => {
				const resolved = resolveKeyInput(input, kvOptions);
				return resolveCloudflareKey(resolved.key, resolved.options);
			});
			const binding = resolveBinding(context, options);

			for (let i = 0; i < resolvedKeys.length; i += CLEAR_BATCH_SIZE) {
				const batch = resolvedKeys.slice(i, i + CLEAR_BATCH_SIZE);
				await Promise.all(batch.map((key) => binding.delete(key)));
			}
		},
		clear: async (context): Promise<void> => {
			const binding = resolveBinding(context, options);
			let cursor: string | undefined;

			while (true) {
				const keys = cursor
					? await binding.list({
							cursor,
							prefix: namespacePrefix || undefined,
						})
					: await binding.list({
							prefix: namespacePrefix || undefined,
						});

				if (keys.keys.length > 0) {
					const resolvedKeys = keys.keys.map((key) => key.name);

					for (let i = 0; i < resolvedKeys.length; i += CLEAR_BATCH_SIZE) {
						const batch = resolvedKeys.slice(i, i + CLEAR_BATCH_SIZE);
						await Promise.all(batch.map((key) => binding.delete(key)));
					}
				}

				if (keys.list_complete) break;
				cursor = keys.cursor;
			}
		},
	};
};

export default cloudflareKVAdapter;
