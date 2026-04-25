import type { RedisOptions } from "ioredis";

export interface PluginOptions {
	/**
	 * Redis connection configuration.
	 * Can be a connection string (e.g., "redis://localhost:6379") or a RedisOptions object.
	 */
	connection: string | RedisOptions;
	/**
	 * Prefix all keys with a non-empty namespace. Defaults to "lucid" so clear operations
	 * only delete Lucid-owned keys. Set to false to disable namespacing.
	 */
	namespace?: string | false;
	/**
	 * How many keys Redis should scan per iteration when clearing namespaced keys.
	 */
	scanCount?: number;
}
