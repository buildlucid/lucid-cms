import { bytesToHex, randomBytes } from "@noble/hashes/utils.js";
import cacheKeys from "./cache-keys.js";
import type { KVAdapterInstance } from "./types.js";

const DEFAULT_NAMESPACE_TOKEN = "0";

const createNamespaceToken = () => {
	return `${Date.now()}:${bytesToHex(randomBytes(16))}`;
};

/**
 * Returns the current token for a namespace.
 * Uses a stable default token when the namespace has not been initialized.
 */
export const getNamespaceToken = async (
	kv: KVAdapterInstance,
	namespace: string,
) => {
	const token = await kv.get<string>(cacheKeys.namespace.token(namespace), {
		hash: true,
	});

	return token ?? DEFAULT_NAMESPACE_TOKEN;
};

/**
 * Returns current tokens for multiple namespaces in a single call.
 */
export const getNamespaceTokens = async (
	kv: KVAdapterInstance,
	namespaces: string[],
) => {
	const uniqueNamespaces = Array.from(new Set(namespaces));
	const tokens = await kv.getMany<string>(
		uniqueNamespaces.map((namespace) => ({
			key: cacheKeys.namespace.token(namespace),
			options: { hash: true },
		})),
	);
	const tokenPairs = uniqueNamespaces.map((namespace, index) => [
		namespace,
		tokens[index]?.value ?? DEFAULT_NAMESPACE_TOKEN,
	]);

	return Object.fromEntries(tokenPairs);
};

/**
 * Rotates a namespace token so any keys derived from that token become stale.
 */
export const invalidateNamespace = async (
	kv: KVAdapterInstance,
	namespace: string,
) => {
	await kv.set(cacheKeys.namespace.token(namespace), createNamespaceToken(), {
		hash: true,
	});
};

/**
 * Rotates tokens for multiple namespaces.
 */
export const invalidateNamespaces = async (
	kv: KVAdapterInstance,
	namespaces: string[],
) => {
	await kv.setMany(
		Array.from(new Set(namespaces)).map((namespace) => ({
			key: cacheKeys.namespace.token(namespace),
			value: createNamespaceToken(),
			options: { hash: true },
		})),
	);
};
