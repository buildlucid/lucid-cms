export type KVAdapter = () => KVAdapterInstance;

export type KVAdapterInstance = {
	get: <R>(key: string) => Promise<R | null>;
};
