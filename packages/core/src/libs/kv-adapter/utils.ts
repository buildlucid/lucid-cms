import { createHash } from "node:crypto";
import type { KVKeyOptions } from "./types.js";

export const HASH_PREFIX = "h:" as const;

/**
 * Deterministically hash a key
 */
export const hashKey = (key: string): string =>
	`${HASH_PREFIX}${createHash("sha256").update(key).digest("base64url")}`;

const utf8ByteLength = (value: string): number => {
	if (typeof Buffer !== "undefined") return Buffer.byteLength(value, "utf8");
	return new globalThis.TextEncoder().encode(value).byteLength;
};

/**
 * Resolve the KV key
 */
export const resolveKey = (
	key: string,
	options?: KVKeyOptions,
	maxKeyBytes?: number,
): string => {
	if (options?.hash) return hashKey(key);

	if (typeof maxKeyBytes === "number" && maxKeyBytes > 0) {
		if (utf8ByteLength(key) > maxKeyBytes) return hashKey(key);
	}

	return key;
};
