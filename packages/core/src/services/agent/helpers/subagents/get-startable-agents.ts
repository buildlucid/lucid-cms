import { getAgents } from "../../../../libs/agent/registry.js";
import type { AgentDefinition } from "../../../../libs/agent/types.js";
import { hasAgentPermission } from "../../../../libs/permission/agent-permissions.js";
import type { AgentToolAuthority } from "../../../../libs/tools/types.js";
import type { ServiceContext } from "../../../../utils/services/types.js";

/** The agents a run can start as sub-agents: those its agent lists, or every enabled agent, that the person it acts for can chat with. */
const getStartableAgents = (
	context: Pick<ServiceContext, "config">,
	props: { authority: AgentToolAuthority; agents?: readonly string[] },
): AgentDefinition[] =>
	getAgents(context.config).filter(
		(agent) =>
			(!props.agents || props.agents.includes(agent.key)) &&
			hasAgentPermission(props.authority, agent.key, "chat"),
	);

export default getStartableAgents;
