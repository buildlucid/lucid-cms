export const getObject = (value: unknown): Record<string, unknown> | null => {
	if (value === null || typeof value !== "object" || Array.isArray(value)) {
		return null;
	}
	return value as Record<string, unknown>;
};

export const getNumber = (value: unknown): number | null => {
	if (typeof value !== "number" || !Number.isFinite(value)) return null;
	return value;
};
