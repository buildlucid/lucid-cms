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

/** Namespace prefix applied before provider-specific key limits are checked. */
export type KVNamespace = string | false;

export interface KVAdapterOptions {
	/**
	 * Prefix all keys with a non-empty namespace so shared backing stores can safely clear
	 * only keys owned by this Lucid instance.
	 */
	namespace?: KVNamespace;
}

/**
 * Batch key input. Object form lets callers override key options per item.
 */
export type KVKeyInput = string | { key: string; options?: KVKeyOptions };

/**
 * Batch set input. Object form keeps value and per-item write options together.
 */
export type KVSetInput<T = unknown> = {
	key: string;
	value: T;
	options?: KVSetOptions;
};

/** Options for adapters that support atomic counter increments. */
export interface KVIncrementOptions extends KVKeyOptions {
	expirationTtl?: number; // seconds
	expirationTimestamp?: number; // unix timestamp in seconds
}

/** Result returned from an atomic counter increment operation. */
export interface KVIncrementResult {
	value: number;
	expirationTtl?: number; // seconds
}

/**
 * Optional KV capability for providers that can increment counters atomically.
 *
 * This is intentionally not required: eventually consistent stores such as
 * Cloudflare KV cannot provide the same semantics safely.
 */
export type KVIncrementCapability = {
	increment: (
		key: string,
		options?: KVIncrementOptions,
	) => Promise<KVIncrementResult>;
};

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
	/** Read a single key, returning null when the key is missing or expired. */
	get: <R>(key: string, options?: KVKeyOptions) => Promise<R | null>;
	/** Set a single key, optionally with an expiration. */
	set: <T>(key: string, value: T, options?: KVSetOptions) => Promise<void>;
	/** Check whether a non-expired key exists. */
	has: (key: string, options?: KVKeyOptions) => Promise<boolean>;
	/** Delete a single key. */
	delete: (key: string, options?: KVKeyOptions) => Promise<void>;
	/**
	 * Read many keys, preserving input order. Missing or expired keys should be
	 * returned with a null value.
	 */
	getMany: <R>(
		keys: KVKeyInput[],
		options?: KVKeyOptions,
	) => Promise<Array<{ key: string; value: R | null }>>;
	/** Set many keys. Adapters should use provider batch primitives where available. */
	setMany: <T>(
		items: Array<KVSetInput<T>>,
		options?: KVSetOptions,
	) => Promise<void>;
	/** Delete many keys. Adapters should use provider batch primitives where available. */
	deleteMany: (keys: KVKeyInput[], options?: KVKeyOptions) => Promise<void>;
	/**
	 * Clear Lucid-owned keys for the adapter namespace. Adapters configured with
	 * namespace: false may clear the whole backing store.
	 */
	clear: () => Promise<void>;
} & Partial<KVIncrementCapability>;

export interface KVSetOptions extends KVKeyOptions {
	expirationTtl?: number; // seconds
	expirationTimestamp?: number; // unix timestamp in seconds
}
