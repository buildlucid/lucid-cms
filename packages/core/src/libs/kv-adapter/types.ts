export type KVAdapter<T = undefined> = T extends undefined
	? () => KVAdapterInstance | Promise<KVAdapterInstance>
	: (options: T) => KVAdapterInstance | Promise<KVAdapterInstance>;

export interface KVKeyOptions {
	/**
	 * If true, the adapter should hash this key before performing the operation.
	 * Useful for KV backends with key size limits or performance issues with large keys.
	 */
	hash?: boolean;
}

export type KVAdapterInstance = {
	/** The adapter type */
	type: "kv-adapter";
	/** A unique identifier key for the adapter of this type */
	key: "passthrough" | "sqlite" | string;
	/**
	 * Lifecycle callbacks
	 */
	lifecycle?: {
		/** Initialize the adapter */
		init?: () => Promise<void>;
		/** Destroy the adapter */
		destroy?: () => Promise<void>;
	};
	/** KV commands */
	command: {
		get: <R>(key: string, options?: KVKeyOptions) => Promise<R | null>;
		set: <T>(key: string, value: T, options?: KVSetOptions) => Promise<void>;
		has: (key: string, options?: KVKeyOptions) => Promise<boolean>;
		delete: (key: string, options?: KVKeyOptions) => Promise<void>;
		clear: () => Promise<void>;
	};
};

export interface KVSetOptions extends KVKeyOptions {
	expirationTtl?: number; // seconds
	expirationTimestamp?: number; // unix timestamp in seconds
}
