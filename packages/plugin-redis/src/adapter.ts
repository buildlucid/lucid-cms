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
	KVIncrementResult,
	ServiceContext,
} from "@lucidcms/core/types";
import type { Redis as RedisClient } from "ioredis";
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
	let client: RedisClient | undefined;
	const namespace = options.namespace ?? DEFAULT_KV_NAMESPACE;
	const namespacePrefix = getNamespacePrefix(namespace);

	const resolveRedisKey = (
		key: string,
		keyOptions?: {
			hash?: boolean;
		},
	) => resolveKey(key, keyOptions, { maxKeyBytes: MAX_KEY_BYTES, namespace });

	const getClient = () => {
		if (!client) {
			throw new Error("Redis KV adapter has not been initialized.");
		}
		return client;
	};

	return {
		type: "kv-adapter",
		key: "redis",
		lifecycle: {
			init: async () => {
				if (client) return;
				client =
					typeof options.connection === "string"
						? new Redis(options.connection)
						: new Redis(options.connection);
			},
			destroy: async () => {
				const activeClient = client;
				client = undefined;
				if (activeClient && activeClient.status !== "end") {
					await activeClient.quit();
				}
			},
		},
		get: async <R>(
			_context: ServiceContext,
			params: KVGetParams,
		): Promise<R | null> => {
			const { key, ...kvOptions } = params;
			const resolvedKey = resolveRedisKey(key, kvOptions);
			const value = await getClient().get(resolvedKey);
			if (value === null) return null;

			return parseKVValue(value);
		},
		set: async (_context, params): Promise<void> => {
			const { key, value, ...kvOptions } = params;
			const resolvedKey = resolveRedisKey(key, kvOptions);
			const serialised = serialiseKVValue(value);
			const ttl = getRedisExpirationTtl(kvOptions);

			if (ttl) {
				await getClient().setex(resolvedKey, ttl, serialised);
				return;
			}

			await getClient().set(resolvedKey, serialised);
		},
		has: async (_context, params): Promise<boolean> => {
			const { key, ...kvOptions } = params;
			const resolvedKey = resolveRedisKey(key, kvOptions);
			const exists = await getClient().exists(resolvedKey);
			return exists === 1;
		},
		delete: async (_context, params): Promise<void> => {
			const { key, ...kvOptions } = params;
			const resolvedKey = resolveRedisKey(key, kvOptions);
			await getClient().unlink(resolvedKey);
		},
		getMany: async <R>(_context: ServiceContext, params: KVGetManyParams) => {
			const { keys, ...options } = params;
			const resolvedKeys = keys.map((input) => {
				const { key, ...keyOptions } =
					typeof input === "string"
						? { key: input, ...options }
						: { ...options, ...input };
				return {
					key,
					resolvedKey: resolveRedisKey(key, keyOptions),
				};
			});
			const values =
				resolvedKeys.length > 0
					? await getClient().mget(
							...resolvedKeys.map((item) => item.resolvedKey),
						)
					: [];

			return resolvedKeys.map((item, index) => {
				const value = values[index] ?? null;
				return {
					key: item.key,
					value: value === null ? null : parseKVValue<R>(value),
				};
			});
		},
		setMany: async (_context, params) => {
			const { items, ...options } = params;
			const pipeline = getClient().pipeline();

			for (const item of items) {
				const { key, value, ...itemOptions } = item;
				const kvOptions = { ...(options ?? {}), ...itemOptions };
				const resolvedKey = resolveRedisKey(key, kvOptions);
				const serialised = serialiseKVValue(value);
				const ttl = getRedisExpirationTtl(kvOptions);

				if (ttl) {
					pipeline.setex(resolvedKey, ttl, serialised);
				} else {
					pipeline.set(resolvedKey, serialised);
				}
			}

			await pipeline.exec();
		},
		deleteMany: async (_context, params: KVDeleteManyParams) => {
			const { keys, ...options } = params;
			const resolvedKeys = keys.map((input) => {
				const { key, ...keyOptions } =
					typeof input === "string"
						? { key: input, ...options }
						: { ...options, ...input };
				return resolveRedisKey(key, keyOptions);
			});
			const client = getClient();

			for (let i = 0; i < resolvedKeys.length; i += CLEAR_BATCH_SIZE) {
				const batch = resolvedKeys.slice(i, i + CLEAR_BATCH_SIZE);
				if (batch.length > 0) {
					await client.unlink(...batch);
				}
			}
		},
		increment: async (_context, params): Promise<KVIncrementResult> => {
			const { key, ...kvOptions } = params;
			const resolvedKey = resolveRedisKey(key, kvOptions);
			const ttl = getRedisExpirationTtl(kvOptions) ?? 0;
			const result = (await getClient().eval(
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
		clear: async (_context): Promise<void> => {
			const keys: string[] = [];
			let cursor = "0";
			const client = getClient();
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
