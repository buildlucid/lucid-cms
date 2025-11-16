import type { RedisOptions } from "ioredis";

export interface PluginOptions {
	/**
	 * Redis connection configuration.
	 * Can be a connection string (e.g., "redis://localhost:6379") or a RedisOptions object.
	 */
	connection: string | RedisOptions;
}
