export type KVAdapter<T = undefined> = T extends undefined
	? () => KVAdapterInstance | Promise<KVAdapterInstance>
	: (options: T) => KVAdapterInstance | Promise<KVAdapterInstance>;

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
		get: <R>(key: string) => Promise<R | null>;
		set: <T>(key: string, value: T, options?: KVSetOptions) => Promise<void>;
		has: (key: string) => Promise<boolean>;
		delete: (key: string) => Promise<void>;
		clear: () => Promise<void>;
	};
};

export interface KVSetOptions {
	expirationTtl?: number; // seconds
	expirationTimestamp?: number; // unix timestamp in seconds
}
