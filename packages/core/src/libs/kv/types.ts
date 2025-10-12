export type KVAdapter = () => KVAdapterInstance | Promise<KVAdapterInstance>;

export type KVAdapterInstance = {
	get: <R>(key: string) => Promise<R | null>;
	set: <T>(key: string, value: T, options?: KVSetOptions) => Promise<void>;
	has: (key: string) => Promise<boolean>;
	delete: (key: string) => Promise<void>;
	clear: () => Promise<void>;
};

export interface KVSetOptions {
	expirationTtl?: number; // seconds
	expirationTimestamp?: number; // unix timestamp in seconds
}
