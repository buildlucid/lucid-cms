import { isTerminalRunStatus } from "../../../libs/agent/run-status.js";
import { checkpointSchema } from "../../../libs/agent/types.js";
import type { LucidAgentInputs } from "../../../libs/db/tables/agent-inputs.js";
import type { Select } from "../../../libs/db/types.js";
import {
	AgentInputsRepository,
	AgentRunsRepository,
} from "../../../libs/repositories/index.js";
import type { ServiceFn } from "../../../utils/services/types.js";

/** A steer whose run has stopped is acknowledged if the run took it, and otherwise becomes a follow-up. */
const settleSteer: ServiceFn<
	[{ input: Select<LucidAgentInputs> }],
	undefined
> = async (context, props) => {
	const Inputs = new AgentInputsRepository(context.db);
	const Runs = new AgentRunsRepository(context.db);

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
	const settled =
		checkpoint.success && checkpoint.data.inputIds?.includes(props.input.id)
			? await Inputs.acknowledge([props.input.id])
			: await Inputs.defer(props.input.id);
	if (settled.error) return settled;

	return { error: undefined, data: undefined };
};

export default settleSteer;
