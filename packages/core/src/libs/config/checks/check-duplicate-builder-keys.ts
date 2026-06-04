import { translate } from "../../i18n/index.js";

const checkDuplicateBuilderKeys = (
	builder: "bricks" | "collections",
	keys?: string[],
) => {
	if (keys === undefined) return;
	if (keys.length === 0) return;
	const uniqueKeys = [...new Set(keys)];

	const hasDuplicates = keys.length !== uniqueKeys.length;

	if (hasDuplicates) {
		throw new Error(
			translate("server:core.config.duplicate.keys", {
				data: { builder: builder },
			}),
		);
	}
};

export default checkDuplicateBuilderKeys;
