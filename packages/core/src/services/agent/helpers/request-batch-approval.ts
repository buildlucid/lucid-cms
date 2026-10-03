import constants from "../../../constants/constants.js";
import { createInteraction } from "../../../libs/agent/interactions.js";
import type { Checkpoint, ToolCall } from "../../../libs/agent/types.js";
import { preflightAgentTool } from "../../../libs/tools/execute-tool.js";
import type { AgentToolExecution } from "../../../libs/tools/types.js";
import type { ServiceFn } from "../../../utils/services/types.js";
import type { ReadCall } from "./get-read-batch.js";
import recordToolResult from "./record-tool-result.js";
import type { RunSession } from "./run-session.js";
import { failedToolRun } from "./tool-outcome.js";

/**
 * Checks each call before asking, then saves one approval covering the calls
 * that can run. Fewer than two leaves the rest to the single-call path.
 */
const requestBatchApproval: ServiceFn<
	[
		{
			checkpoint: Checkpoint;
			session: RunSession;
			batch: ReadCall[];
			executionFor: (call: ToolCall) => AgentToolExecution;
		},
	],
	"completed" | "waiting"
> = async (context, props) => {
	const { checkpoint, session } = props;
	const approvals = [];

	for (const { call, tool } of props.batch) {
		const prepared = await preflightAgentTool({
			context,
			tool,
			input: call.input,
			execution: props.executionFor(call),
		});
		if (prepared.type !== "ready") {
			const saved = await recordToolResult(context, {
				call,
				checkpoint,
				session,
				outcome: failedToolRun(context, prepared),
			});
			if (saved.error) return saved;
			continue;
		}

		approvals.push({
			toolCallId: call.id,
			toolName: tool.name,
			title: context.translate(tool.describe(call.input)),
			input: call.input,
		});
	}

	const first = approvals[0];
	if (approvals.length < 2 || !first) {
		return { error: undefined, data: "completed" };
	}

	checkpoint.pending = createInteraction({
		callId: first.toolCallId,
		key: constants.agent.widgets.approvalBatch,
		title: context.translate("server:agent.tool.approval.batch", {
			data: { count: approvals.length },
		}),
		data: {},
		approvals,
	});
	checkpoint.parts.push(checkpoint.pending.widget);

	const saved = await session.save();
	if (saved.error) return saved;

	await session.emit({
		messageId: checkpoint.messageId,
		...checkpoint.pending.widget,
	});

	return { error: undefined, data: "waiting" };
};

export default requestBatchApproval;
