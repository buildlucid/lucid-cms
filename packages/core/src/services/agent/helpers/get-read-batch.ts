import constants from "../../../constants/constants.js";
import { isToolCallComplete } from "../../../libs/agent/context.js";
import { needsApproval } from "../../../libs/agent/interactions.js";
import type { Checkpoint, ToolCall } from "../../../libs/agent/types.js";
import type { AgentToolDefinition } from "../../../libs/tools/types.js";
import type { RunSetup } from "./resolve-run-setup.js";

export type ReadCall = { call: ToolCall; tool: AgentToolDefinition };

/** A bounded group stops at stateful tools, policy changes and the end of a saved approval. */
const getReadBatch = (props: {
	checkpoint: Checkpoint;
	setup: RunSetup;
}): ReadCall[] => {
	const { checkpoint, setup } = props;
	const approvals = checkpoint.pending?.widget.interaction.approvals;
	if (checkpoint.pending && !approvals) return [];

	const batch: ReadCall[] = [];

	for (const call of checkpoint.calls.slice(checkpoint.cursor)) {
		if (isToolCallComplete(checkpoint, call.id)) continue;

		const tool = setup.tools.find((tool) => tool.name === call.name);
		if (!tool?.readOnly || !tool.parallelSafe || tool.interaction) break;

		const approved = approvals?.some(
			(approval) => approval.toolCallId === call.id,
		);
		if (approvals && !approved) break;

		const first = batch[0];
		const samePolicy =
			!first ||
			needsApproval(checkpoint, tool) === needsApproval(checkpoint, first.tool);
		if (!samePolicy) break;

		batch.push({ call, tool });
		if (batch.length === constants.agent.readConcurrency) break;
	}

	return batch;
};

export default getReadBatch;
