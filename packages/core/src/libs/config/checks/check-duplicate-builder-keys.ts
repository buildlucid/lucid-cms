import T from "../../../translations/index.js";

const checkDuplicateBuilderKeys = (
	builder: "ai guidance" | "bricks" | "collections",
	keys?: string[],
) => {
	if (keys === undefined) return;
	if (keys.length === 0) return;
	const uniqueKeys = [...new Set(keys)];

	const hasDuplicates = keys.length !== uniqueKeys.length;

	if (hasDuplicates) {
		throw new Error(T("config_duplicate_keys", { builder: builder }));
	}
};

export default checkDuplicateBuilderKeys;
