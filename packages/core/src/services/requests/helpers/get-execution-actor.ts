import type { ToolkitActor } from "../../../libs/permission/toolkit-actor.js";

/** Builds the job's JSON actor, returning null for deleted users so completion fails instead of running as the system. */
const getExecutionActor = (data: {
	userId: number | null;
	system: boolean;
	agentRunId?: string | null;
}): ToolkitActor | null => {
	const agent = data.agentRunId ? { agentRunId: data.agentRunId } : {};
	if (data.system) return { type: "system", ...agent };
	if (data.userId !== null) {
		return { type: "user", userId: data.userId, ...agent };
	}
	return null;
};

export default getExecutionActor;
