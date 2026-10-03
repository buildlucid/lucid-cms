import {
	advanceToolCursor,
	isToolCallComplete,
	settleToolCall,
} from "../../../libs/agent/context.js";
import type { Checkpoint, ToolCall } from "../../../libs/agent/types.js";
import { agentFormatter } from "../../../libs/formatters/index.js";
import type { AgentWidgetPart } from "../../../types/response.js";
import type { ServiceFn } from "../../../utils/services/types.js";
import type { RunSession } from "./run-session.js";
import type { ToolResult } from "./tool-outcome.js";

/** One coordinator persists each completion before publishing it. Saved parts are also recovery receipts. */
const recordToolResult: ServiceFn<
	[
		{
			call: ToolCall;
			checkpoint: Checkpoint;
			session: RunSession;
			outcome: ToolResult;
		},
	],
	"completed"
> = async (_context, { call, checkpoint, session, outcome }) => {
	const { output, summary, failed } = outcome;

	const status = failed ? "failed" : "complete";

	const part = settleToolCall(checkpoint, call, { status, output, summary });

	//* a grouped approval stays pending until every call it covers has a receipt
	const approvals = checkpoint.pending?.widget.interaction.approvals;
	const approvalsSettled =
		!approvals ||
		approvals.every((approval) =>
			isToolCallComplete(checkpoint, approval.toolCallId),
		);
	if (approvalsSettled) checkpoint.pending = undefined;

	advanceToolCursor(checkpoint);

	const widgets: AgentWidgetPart[] = failed
		? []
		: (outcome.widgets ?? []).map(({ key, version, data }) => ({
				type: "widget",
				key,
				version,
				data,
			}));
	checkpoint.parts.push(...widgets);

	const saved = await session.save();
	if (saved.error) return saved;

	for (const widget of widgets) {
		await session.emit({ messageId: checkpoint.messageId, ...widget });
	}

	await session.emit({
		messageId: checkpoint.messageId,
		...agentFormatter.formatTool({ part }),
	});

	return { error: undefined, data: "completed" };
};

export default recordToolResult;
