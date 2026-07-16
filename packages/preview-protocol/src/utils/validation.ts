/** Checks for a plain object before reading untrusted protocol data. */
export const isRecord = (value: unknown): value is Record<string, unknown> =>
	typeof value === "object" && value !== null && !Array.isArray(value);

/** Accepts non-empty strings within a protocol limit. */
export const isBoundedString = (
	value: unknown,
	maximum: number,
): value is string =>
	typeof value === "string" && value.length > 0 && value.length <= maximum;

/** Rejects unexpected keys so message shapes remain predictable. */
export const hasOnlyKeys = (
	value: Record<string, unknown>,
	keys: readonly string[],
) => Object.keys(value).every((key) => keys.includes(key));
