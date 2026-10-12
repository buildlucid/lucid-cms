import constants from "../../../constants/constants.js";
import { isToolCallComplete } from "../../../libs/agent/context.js";
import { needsConfirmation } from "../../../libs/agent/interactions.js";
import type { Checkpoint, ToolCall } from "../../../libs/agent/types.js";
import type { AgentToolDefinition } from "../../../libs/tools/types.js";
import type { ResolvedLucidConfig } from "../../../types/config.js";
import type { RunSetup } from "./resolve-run-setup.js";

export type ReadCall = { call: ToolCall; tool: AgentToolDefinition };

/** A bounded group stops at stateful tools, policy changes and the end of a saved confirmation. */
const getReadBatch = (props: {
	checkpoint: Checkpoint;
	setup: RunSetup;
	config: ResolvedLucidConfig;
}): ReadCall[] => {
	const { checkpoint, setup, config } = props;
	const confirmations = checkpoint.pending?.widget.interaction.confirmations;
	if (checkpoint.pending && !confirmations) return [];

	const batch: ReadCall[] = [];

	for (const call of checkpoint.calls.slice(checkpoint.cursor)) {
		if (isToolCallComplete(checkpoint, call.id)) continue;

		const tool = setup.tools.find((tool) => tool.name === call.name);
		if (!tool?.readOnly || !tool.parallelSafe || tool.interaction) break;

		const confirmed = confirmations?.some(
			(confirmation) => confirmation.toolCallId === call.id,
		);
		if (confirmations && !confirmed) break;

		const first = batch[0];
		const samePolicy =
			!first ||
			needsConfirmation({ checkpoint, tool, input: call.input, config }) ===
				needsConfirmation({
					checkpoint,
					tool: first.tool,
					input: first.call.input,
					config,
				});
		if (!samePolicy) break;

		batch.push({ call, tool });
		if (batch.length === constants.agent.readConcurrency) break;
	}

	return batch;
};

export default getReadBatch;
