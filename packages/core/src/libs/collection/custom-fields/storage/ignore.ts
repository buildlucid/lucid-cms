import type { IgnoreModeDefinition } from "./types.js";

export const ignoreMode: IgnoreModeDefinition = {
	mode: "ignore",
	baseTablePriority: 0,
	contentTypeGen: () => ({
		omitted: true,
		declarations: [],
	}),
};
