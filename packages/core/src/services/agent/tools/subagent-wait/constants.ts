import type { AgentLucidToolName } from "@lucidcms/types";

/** Avoids import cycles when other tools and instructions reference the tool name. */
export const subagentWaitToolName =
	"lucid_subagent_wait" satisfies AgentLucidToolName;
