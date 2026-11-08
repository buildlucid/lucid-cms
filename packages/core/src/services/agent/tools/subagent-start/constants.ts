import type { AgentLucidToolName } from "@lucidcms/types";

/** Avoids import cycles when other tools and instructions reference the tool name. */
export const subagentStartToolName =
	"lucid_subagent_start" satisfies AgentLucidToolName;
