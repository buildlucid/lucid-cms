import type { StorageModeDefinition } from "./types.js";

export const columnMode: StorageModeDefinition<"column"> = {
	mode: "column",
	baseTablePriority: 0,
};
