import type { AgentLucidToolName } from "@lucidcms/types";

/** Avoids import cycles when instructions reference the tool name. */
export const saveMemoryToolName =
	"lucid_memory_save" satisfies AgentLucidToolName;
