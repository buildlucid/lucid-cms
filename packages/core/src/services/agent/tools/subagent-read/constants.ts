import type { AgentLucidToolName } from "@lucidcms/types";

/** Avoids import cycles when other tools and instructions reference the tool name. */
export const subagentReadToolName =
	"lucid_subagent_read" satisfies AgentLucidToolName;
