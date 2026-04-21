import type { IgnoreModeDefinition } from "./types.js";

export const ignoreMode: IgnoreModeDefinition = {
	mode: "ignore",
	baseTablePriority: 0,
	clientTypeGen: () => ({
		omitted: true,
		declarations: [],
	}),
};
