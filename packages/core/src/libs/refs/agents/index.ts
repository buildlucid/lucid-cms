import getAgentActors from "../../../services/agent/helpers/get-agent-actors.js";
import type { RefResourceDefinition, RefResourceTargets } from "../types.js";

/** Resolves the agents behind the run IDs on document and version metadata. */
const agentRefResource = {
	resource: "agents",
	resolve: async (context, data) => {
		const agentsRes = await getAgentActors(context, {
			runIds: Array.from(data.targets.values()).flatMap((ids) =>
				Array.from(ids, (id) => (typeof id === "string" ? id : null)),
			),
		});
		if (agentsRes.error) return agentsRes;

		return {
			error: undefined,
			data: {
				agents: Array.from(agentsRes.data, ([id, agent]) => ({
					id,
					...agent,
				})),
			},
		};
	},
} satisfies RefResourceDefinition<"agents", { targets: RefResourceTargets }>;

export default agentRefResource;
