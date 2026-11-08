import type { AgentLucidToolName } from "@lucidcms/types";

/** Avoids import cycles when other tools and instructions reference the tool name. */
export const subagentAgentsToolName =
	"lucid_subagent_agents" satisfies AgentLucidToolName;
