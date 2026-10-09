import type { LucidRequestEvents } from "../../../libs/db/tables/index.js";
import type { Select } from "../../../libs/db/types.js";
import formatter from "../../../libs/formatters/index.js";
import { AgentAttributionsRepository } from "../../../libs/repositories/index.js";
import type { LucidActor } from "../../../types/hono.js";
import type { ServiceFn } from "../../../utils/services/types.js";

/** Checks comment ownership, requiring agent comments to match both the agent and its user or system identity across runs. */
const isCommentAuthor: ServiceFn<
	[
		{
			comment: Pick<Select<LucidRequestEvents>, "user_id" | "agent_run_id">;
			user: LucidActor;
			agentRunId?: string;
		},
	],
	boolean
> = async (context, data) => {
	const { comment } = data;
	if (comment.user_id !== data.user.id) {
		return { error: undefined, data: false };
	}
	//* without an agent, a missing user could be the system or a deleted person, so neither is the author
	if (comment.agent_run_id === null || data.agentRunId === undefined) {
		return {
			error: undefined,
			data:
				comment.agent_run_id === null &&
				data.agentRunId === undefined &&
				comment.user_id !== null,
		};
	}
	if (comment.agent_run_id === data.agentRunId) {
		return { error: undefined, data: true };
	}

	const AgentAttributions = new AgentAttributionsRepository(context.db);
	const attributionsRes = await AgentAttributions.selectMultipleByRun([
		comment.agent_run_id,
		data.agentRunId,
	]);
	if (attributionsRes.error) return attributionsRes;

	const written = attributionsRes.data.find(
		(attribution) => attribution.run_id === comment.agent_run_id,
	);
	const acting = attributionsRes.data.find(
		(attribution) => attribution.run_id === data.agentRunId,
	);
	return {
		error: undefined,
		data:
			written !== undefined &&
			acting !== undefined &&
			written.agent_key === acting.agent_key &&
			formatter.formatBoolean(written.system) ===
				formatter.formatBoolean(acting.system),
	};
};

export default isCommentAuthor;
