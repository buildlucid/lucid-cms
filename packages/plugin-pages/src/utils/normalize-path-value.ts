const normalizePathValue = (
	value: string | null | undefined,
): string | null | undefined => {
	if (value === null || value === undefined) return value;
	if (value === "/") return "/";

	return value.toLowerCase();
};

export default normalizePathValue;
