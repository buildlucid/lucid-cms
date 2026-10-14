import type { AgentLucidToolName } from "@lucidcms/types";

/** Avoids import cycles when instructions reference the tool name. */
export const deleteMemoryToolName =
	"lucid_memory_delete" satisfies AgentLucidToolName;
