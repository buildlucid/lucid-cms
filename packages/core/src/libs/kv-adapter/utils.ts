import { sha256 } from "@noble/hashes/sha2.js";
import { utf8ToBytes } from "@noble/hashes/utils.js";
import type {
	KVAdapterInstance,
	KVIncrementCapability,
	KVKeyInput,
	KVKeyOptions,
	KVNamespace,
} from "./types.js";

export const HASH_PREFIX = "h:" as const;

type ResolveKeyOptions = {
	maxKeyBytes?: number;
	namespace?: KVNamespace;
};

type ParsedResolveKeyOptions = ResolveKeyOptions & {
	namespacePrefix: string;
};

/**
 * Converts a namespace option into the literal prefix stored in the backing KV.
 */
export const getNamespacePrefix = (namespace?: KVNamespace): string => {
	if (namespace === undefined || namespace === false) return "";

	if (namespace.length === 0) {
		throw new Error(
			"KV namespace cannot be an empty string. Use false to disable namespacing.",
		);
	}

	return `${namespace}:`;
};

const toBase64Url = (bytes: Uint8Array): string => {
	let binary = "";
	const chunkSize = 0x8000;

	for (let i = 0; i < bytes.length; i += chunkSize) {
		const chunk = bytes.subarray(i, i + chunkSize);
		binary += String.fromCharCode(...chunk);
	}

	const base64 =
		typeof btoa === "function"
			? btoa(binary)
			: Buffer.from(bytes).toString("base64");

	return base64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
};

/**
 * Deterministically hash a key
 */
export const hashKey = (key: string): string =>
	`${HASH_PREFIX}${toBase64Url(sha256(utf8ToBytes(key)))}`;

const utf8ByteLength = (value: string): number => {
	if (typeof Buffer !== "undefined") return Buffer.byteLength(value, "utf8");
	return new globalThis.TextEncoder().encode(value).byteLength;
};

const parseResolveKeyOptions = (
	options?: number | ResolveKeyOptions,
): ParsedResolveKeyOptions => {
	const resolved =
		typeof options === "number" ? { maxKeyBytes: options } : (options ?? {});

	return {
		...resolved,
		namespacePrefix: getNamespacePrefix(resolved.namespace),
	};
};

/**
 * Normalises a batch input and merges shared options with per-key options.
 */
export const resolveKeyInput = (
	input: KVKeyInput,
	options?: KVKeyOptions,
): { key: string; options?: KVKeyOptions } => {
	if (typeof input === "string") {
		return { key: input, options };
	}

	return {
		key: input.key,
		options:
			options || input.options
				? { ...(options ?? {}), ...(input.options ?? {}) }
				: undefined,
	};
};

/**
 * Resolve the KV key
 */
export const resolveKey = (
	key: string,
	options?: KVKeyOptions,
	resolveOptions?: number | ResolveKeyOptions,
): string => {
	const { maxKeyBytes, namespacePrefix } =
		parseResolveKeyOptions(resolveOptions);
	const namespacedKey = `${namespacePrefix}${key}`;

	const shouldHash =
		options?.hash ||
		(typeof maxKeyBytes === "number" &&
			maxKeyBytes > 0 &&
			utf8ByteLength(namespacedKey) > maxKeyBytes);

	const resolvedKey = shouldHash
		? `${namespacePrefix}${hashKey(key)}`
		: namespacedKey;

	if (
		typeof maxKeyBytes === "number" &&
		maxKeyBytes > 0 &&
		utf8ByteLength(resolvedKey) > maxKeyBytes
	) {
		throw new Error(
			`Resolved KV key exceeds the maximum size of ${maxKeyBytes} bytes. Use a shorter KV namespace.`,
		);
	}

	return resolvedKey;
};

/**
 * Type guard for adapters that provide provider-backed atomic increments.
 */
export const supportsKVIncrement = (
	adapter: KVAdapterInstance,
): adapter is KVAdapterInstance & KVIncrementCapability =>
	typeof adapter.increment === "function";
