import type { ServiceContext } from "../../utils/services/types.js";
import type { AdapterLifecycleContext } from "../runtime/types.js";

export type KVAdapter<T = undefined> = T extends undefined
	? () => KVAdapterInstance | Promise<KVAdapterInstance>
	: (options: T) => KVAdapterInstance | Promise<KVAdapterInstance>;

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
export type KVKeyInput =
	| string
	| {
			key: string;
			/**
			 * If true, the adapter should hash this key before performing the operation.
			 * Useful for KV backends with key size limits or performance issues with large keys.
			 */
			hash?: boolean;
	  };

/**
 * Batch set input. Object form keeps value and per-item write options together.
 */
export type KVSetInput<T = unknown> = {
	key: string;
	value: T;
	hash?: boolean;
	expirationTtl?: number; // seconds
	expirationTimestamp?: number; // unix timestamp in seconds
};

export type KVGetParams = {
	key: string;
	hash?: boolean;
};

export type KVSetParams<T = unknown> = {
	key: string;
	value: T;
	hash?: boolean;
	expirationTtl?: number; // seconds
	expirationTimestamp?: number; // unix timestamp in seconds
};

export type KVHasParams = {
	key: string;
	hash?: boolean;
};

export type KVDeleteParams = {
	key: string;
	hash?: boolean;
};

export type KVGetManyParams = {
	keys: KVKeyInput[];
	hash?: boolean;
};

export type KVSetManyParams<T = unknown> = {
	items: Array<KVSetInput<T>>;
	hash?: boolean;
	expirationTtl?: number; // seconds
	expirationTimestamp?: number; // unix timestamp in seconds
};

export type KVDeleteManyParams = {
	keys: KVKeyInput[];
	hash?: boolean;
};

export type KVIncrementParams = {
	key: string;
	hash?: boolean;
	expirationTtl?: number; // seconds
	expirationTimestamp?: number; // unix timestamp in seconds
};

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
		context: ServiceContext,
		params: KVIncrementParams,
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
		init?: (context: AdapterLifecycleContext) => Promise<void>;
		/** Destroy the adapter */
		destroy?: (context: AdapterLifecycleContext) => Promise<void>;
	};
	/** Read a single key, returning null when the key is missing or expired. */
	get: <R>(context: ServiceContext, params: KVGetParams) => Promise<R | null>;
	/** Set a single key, optionally with an expiration. */
	set: <T>(context: ServiceContext, params: KVSetParams<T>) => Promise<void>;
	/** Check whether a non-expired key exists. */
	has: (context: ServiceContext, params: KVHasParams) => Promise<boolean>;
	/** Delete a single key. */
	delete: (context: ServiceContext, params: KVDeleteParams) => Promise<void>;
	/**
	 * Read many keys, preserving input order. Missing or expired keys should be
	 * returned with a null value.
	 */
	getMany: <R>(
		context: ServiceContext,
		params: KVGetManyParams,
	) => Promise<Array<{ key: string; value: R | null }>>;
	/** Set many keys. Adapters should use provider batch primitives where available. */
	setMany: <T>(
		context: ServiceContext,
		params: KVSetManyParams<T>,
	) => Promise<void>;
	/** Delete many keys. Adapters should use provider batch primitives where available. */
	deleteMany: (
		context: ServiceContext,
		params: KVDeleteManyParams,
	) => Promise<void>;
	/**
	 * Clear Lucid-owned keys for the adapter namespace. Adapters configured with
	 * namespace: false may clear the whole backing store.
	 */
	clear: (context: ServiceContext) => Promise<void>;
} & Partial<KVIncrementCapability>;
