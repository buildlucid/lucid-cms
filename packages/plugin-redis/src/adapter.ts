import {
	DEFAULT_KV_NAMESPACE,
	getNamespacePrefix,
	resolveKey,
	resolveKeyInput,
} from "@lucidcms/core/kv";
import type {
	KVAdapterInstance,
	KVIncrementOptions,
	KVIncrementResult,
	KVKeyInput,
	KVKeyOptions,
	KVSetInput,
	KVSetOptions,
} from "@lucidcms/core/types";
import { Redis } from "ioredis";
import type { PluginOptions } from "./types.js";
import getRedisExpirationTtl from "./utils/get-expiration-ttl.js";
import parseKVValue from "./utils/parse-kv-value.js";
import serialiseKVValue from "./utils/serialise-kv-value.js";

const MAX_KEY_BYTES = 512;
const CLEAR_BATCH_SIZE = 500;
const INCREMENT_SCRIPT = `
local value = redis.call("INCR", KEYS[1])
local ttl = tonumber(ARGV[1])
if value == 1 and ttl and ttl > 0 then
	redis.call("EXPIRE", KEYS[1], ttl)
end
return { value, redis.call("TTL", KEYS[1]) }
`;

const redisKVAdapter = (options: PluginOptions): KVAdapterInstance => {
	const client =
		typeof options.connection === "string"
			? new Redis(options.connection)
			: new Redis(options.connection);
	const namespace = options.namespace ?? DEFAULT_KV_NAMESPACE;
	const namespacePrefix = getNamespacePrefix(namespace);

	const resolveRedisKey = (key: string, keyOptions?: KVKeyOptions) =>
		resolveKey(key, keyOptions, { maxKeyBytes: MAX_KEY_BYTES, namespace });

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
			const resolvedKey = resolveRedisKey(key, kvOptions);
			const value = await client.get(resolvedKey);
			if (value === null) return null;

			return parseKVValue(value);
		},
		set: async (
			key: string,
			value: unknown,
			kvOptions?: KVSetOptions,
		): Promise<void> => {
			const resolvedKey = resolveRedisKey(key, kvOptions);
			const serialised = serialiseKVValue(value);
			const ttl = getRedisExpirationTtl(kvOptions);

			if (ttl) {
				await client.setex(resolvedKey, ttl, serialised);
				return;
			}

			await client.set(resolvedKey, serialised);
		},
		has: async (key: string, kvOptions?: KVKeyOptions): Promise<boolean> => {
			const resolvedKey = resolveRedisKey(key, kvOptions);
			const exists = await client.exists(resolvedKey);
			return exists === 1;
		},
		delete: async (key: string, kvOptions?: KVKeyOptions): Promise<void> => {
			const resolvedKey = resolveRedisKey(key, kvOptions);
			await client.unlink(resolvedKey);
		},
		getMany: async <R>(keys: KVKeyInput[], options?: KVKeyOptions) => {
			const resolvedKeys = keys.map((input) => {
				const resolved = resolveKeyInput(input, options);
				return {
					key: resolved.key,
					resolvedKey: resolveRedisKey(resolved.key, resolved.options),
				};
			});
			const values =
				resolvedKeys.length > 0
					? await client.mget(...resolvedKeys.map((item) => item.resolvedKey))
					: [];

			return resolvedKeys.map((item, index) => {
				const value = values[index] ?? null;
				return {
					key: item.key,
					value: value === null ? null : parseKVValue<R>(value),
				};
			});
		},
		setMany: async (items: Array<KVSetInput>, options?: KVSetOptions) => {
			const pipeline = client.pipeline();

			for (const item of items) {
				const kvOptions = { ...(options ?? {}), ...(item.options ?? {}) };
				const resolvedKey = resolveRedisKey(item.key, kvOptions);
				const serialised = serialiseKVValue(item.value);
				const ttl = getRedisExpirationTtl(kvOptions);

				if (ttl) {
					pipeline.setex(resolvedKey, ttl, serialised);
				} else {
					pipeline.set(resolvedKey, serialised);
				}
			}

			await pipeline.exec();
		},
		deleteMany: async (keys: KVKeyInput[], options?: KVKeyOptions) => {
			const resolvedKeys = keys.map((input) => {
				const resolved = resolveKeyInput(input, options);
				return resolveRedisKey(resolved.key, resolved.options);
			});

			for (let i = 0; i < resolvedKeys.length; i += CLEAR_BATCH_SIZE) {
				const batch = resolvedKeys.slice(i, i + CLEAR_BATCH_SIZE);
				if (batch.length > 0) {
					await client.unlink(...batch);
				}
			}
		},
		increment: async (
			key: string,
			kvOptions?: KVIncrementOptions,
		): Promise<KVIncrementResult> => {
			const resolvedKey = resolveRedisKey(key, kvOptions);
			const ttl = getRedisExpirationTtl(kvOptions) ?? 0;
			const result = (await client.eval(
				INCREMENT_SCRIPT,
				1,
				resolvedKey,
				ttl,
			)) as [number, number];
			const expirationTtl = result[1] > 0 ? result[1] : undefined;

			return {
				value: result[0],
				expirationTtl,
			};
		},
		clear: async (): Promise<void> => {
			const keys: string[] = [];
			let cursor = "0";
			// Escape Redis glob metacharacters so namespace prefixes match literally.
			const pattern = namespacePrefix
				? `${namespacePrefix.replace(/[\\*?[\]]/g, "\\$&")}*`
				: "*";

			do {
				const result = options.scanCount
					? await client.scan(
							cursor,
							"MATCH",
							pattern,
							"COUNT",
							options.scanCount,
						)
					: await client.scan(cursor, "MATCH", pattern);
				cursor = result[0];
				keys.push(...result[1]);
			} while (cursor !== "0");

			for (let i = 0; i < keys.length; i += CLEAR_BATCH_SIZE) {
				const batch = keys.slice(i, i + CLEAR_BATCH_SIZE);
				if (batch.length > 0) {
					await client.unlink(...batch);
				}
			}
		},
	};
};

export default redisKVAdapter;
