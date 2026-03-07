import type { StorageModeDefinition } from "./types.js";

export const ignoreMode: StorageModeDefinition<"ignore"> = {
	mode: "ignore",
	baseTablePriority: 0,
};
