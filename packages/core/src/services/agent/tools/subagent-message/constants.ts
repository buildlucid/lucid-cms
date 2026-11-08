import type { AgentLucidToolName } from "@lucidcms/types";

/** Avoids import cycles when other tools and instructions reference the tool name. */
export const subagentMessageToolName =
	"lucid_subagent_message" satisfies AgentLucidToolName;
