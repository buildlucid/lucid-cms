import type { StorageModeDefinition } from "./types.js";

export const relationTableMode: StorageModeDefinition<"relation-table"> = {
	mode: "relation-table",
	baseTablePriority: 600,
};
