import { isTerminalRunStatus } from "../../../libs/agent/run-status.js";
import { checkpointSchema } from "../../../libs/agent/types.js";
import type { LucidAgentInputs } from "../../../libs/db/tables/agent-inputs.js";
import type { Select } from "../../../libs/db/types.js";
import {
	AgentConversationsRepository,
	AgentInputsRepository,
	AgentRunsRepository,
} from "../../../libs/repositories/index.js";
import type { ServiceFn } from "../../../utils/services/types.js";

/** A steer whose run has stopped is acknowledged if the run took it, and otherwise becomes a follow-up, except a person's steer into a sub-agent, which is dropped. */
const settleSteer: ServiceFn<
	[{ input: Select<LucidAgentInputs> }],
	undefined
> = async (context, props) => {
	const Inputs = new AgentInputsRepository(context.db);
	const Runs = new AgentRunsRepository(context.db);
	const Conversations = new AgentConversationsRepository(context.db);

	const run = await Runs.selectSingle({
		select: ["status", "checkpoint"],
		where: [
			{ key: "id", operator: "=", value: props.input.target_run_id ?? "" },
		],
	});
	if (run.error) return run;
	if (run.data && !isTerminalRunStatus(run.data.status)) {
		return { error: undefined, data: undefined };
	}

	const checkpoint = checkpointSchema.safeParse(run.data?.checkpoint);
	if (
		checkpoint.success &&
		checkpoint.data.inputIds?.includes(props.input.id)
	) {
		const acknowledged = await Inputs.acknowledge([props.input.id]);
		if (acknowledged.error) return acknowledged;

		return { error: undefined, data: undefined };
	}

	//* people can only steer a sub-agent while it runs, so a late correction is dropped rather than starting a run
	if (props.input.source === "person") {
		const conversation = await Conversations.selectSingle({
			select: ["parent_conversation_id"],
			where: [{ key: "id", operator: "=", value: props.input.conversation_id }],
		});
		if (conversation.error) return conversation;

		if (conversation.data?.parent_conversation_id) {
			const discarded = await Inputs.discard(props.input.id);
			if (discarded.error) return discarded;

			return { error: undefined, data: undefined };
		}
	}

	const deferred = await Inputs.defer(props.input.id);
	if (deferred.error) return deferred;

	return { error: undefined, data: undefined };
};

export default settleSteer;
