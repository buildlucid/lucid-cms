import {
	DEFAULT_KV_NAMESPACE,
	getNamespacePrefix,
	resolveKey,
} from "@lucidcms/core/kv";
import type {
	KVAdapterInstance,
	KVDeleteManyParams,
	KVGetManyParams,
	KVGetParams,
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
	const resolveCloudflareKey = (
		key: string,
		keyOptions?: {
			hash?: boolean;
		},
	) => resolveKey(key, keyOptions, { maxKeyBytes: MAX_KEY_BYTES, namespace });

	return {
		type: "kv-adapter",
		key: "cloudflare-kv",
		get: async <R>(
			context: ServiceContext,
			params: KVGetParams,
		): Promise<R | null> => {
			const { key, ...kvOptions } = params;
			const resolvedKey = resolveCloudflareKey(key, kvOptions);
			const binding = resolveBinding(context, options);
			const value = await binding.get(resolvedKey, { type: "text" });
			if (value === null) return null;

			return parseKVValue(value);
		},
		set: async (context, params): Promise<void> => {
			const { key, value, ...kvOptions } = params;
			const resolvedKey = resolveCloudflareKey(key, kvOptions);
			const expirationTtl = getCloudflareKVExpirationTtl(kvOptions);
			const binding = resolveBinding(context, options);

			await binding.put(resolvedKey, serialiseKVValue(value), {
				expirationTtl,
			});
		},
		has: async (context: ServiceContext, params): Promise<boolean> => {
			const { key, ...kvOptions } = params;
			const resolvedKey = resolveCloudflareKey(key, kvOptions);
			const binding = resolveBinding(context, options);
			const value = await binding.get(resolvedKey, { type: "text" });
			return value !== null;
		},
		delete: async (context: ServiceContext, params): Promise<void> => {
			const { key, ...kvOptions } = params;
			const resolvedKey = resolveCloudflareKey(key, kvOptions);
			const binding = resolveBinding(context, options);
			await binding.delete(resolvedKey);
		},
		getMany: async <R>(context: ServiceContext, params: KVGetManyParams) => {
			const { keys, ...kvOptions } = params;
			const binding = resolveBinding(context, options);

			return Promise.all(
				keys.map(async (input) => {
					const { key, ...keyOptions } =
						typeof input === "string"
							? { key: input, ...kvOptions }
							: { ...kvOptions, ...input };
					const value = await binding.get(
						resolveCloudflareKey(key, keyOptions),
						{ type: "text" },
					);

					return {
						key,
						value: value === null ? null : parseKVValue<R>(value),
					};
				}),
			);
		},
		setMany: async (context, params) => {
			const { items, ...kvOptions } = params;
			const binding = resolveBinding(context, options);
			await Promise.all(
				items.map((item) => {
					const { key, value, ...perItemOptions } = item;
					const itemOptions = {
						...(kvOptions ?? {}),
						...perItemOptions,
					};
					const resolvedKey = resolveCloudflareKey(key, itemOptions);
					const expirationTtl = getCloudflareKVExpirationTtl(itemOptions);

					return binding.put(resolvedKey, serialiseKVValue(value), {
						expirationTtl,
					});
				}),
			);
		},
		deleteMany: async (context, params: KVDeleteManyParams) => {
			const { keys, ...kvOptions } = params;
			const resolvedKeys = keys.map((input) => {
				const { key, ...keyOptions } =
					typeof input === "string"
						? { key: input, ...kvOptions }
						: { ...kvOptions, ...input };
				return resolveCloudflareKey(key, keyOptions);
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
