import type { LucidAgentInputs } from "../../../libs/db/tables/agent-inputs.js";
import type { Select } from "../../../libs/db/types.js";
import { AgentInputsRepository } from "../../../libs/repositories/index.js";
import type { ServiceFn } from "../../../utils/services/types.js";
import startRun from "../start-run.js";
import enqueueRun from "./enqueue-run.js";

/** Starts the run answering a queued message, acting for its sender. Retrying the same input resumes a partial start. */
const startInput: ServiceFn<
	[
		{
			conversationId: string;
			input: Pick<
				Select<LucidAgentInputs>,
				"id" | "user_id" | "text" | "references"
			>;
			dispatch: boolean;
		},
	],
	{ runId: string }
> = async (context, props) => {
	const started = await startRun(context, {
		conversationId: props.conversationId,
		userId: props.input.user_id,
		requestId: props.input.id,
		text: props.input.text,
		references: props.input.references,
	});
	if (started.error) return started;

	const Inputs = new AgentInputsRepository(context.db);

	const acknowledged = await Inputs.acknowledge([props.input.id]);
	if (acknowledged.error) return acknowledged;

	if (props.dispatch) {
		const queued = await enqueueRun(context, {
			runId: started.data.runId,
			userId: props.input.user_id,
		});
		if (queued.error) return queued;
	}

	return started;
};

export default startInput;
