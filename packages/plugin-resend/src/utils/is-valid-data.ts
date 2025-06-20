const isValidPData = (
	data: unknown,
): data is Record<string, unknown> | null | undefined => {
	return (
		data === null ||
		data === undefined ||
		(typeof data === "object" && data !== null && !Array.isArray(data))
	);
};

export default isValidPData;
