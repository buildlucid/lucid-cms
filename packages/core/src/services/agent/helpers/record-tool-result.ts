import {
	advanceToolCursor,
	isToolCallComplete,
	settleToolCall,
} from "../../../libs/agent/context.js";
import type { Checkpoint, ToolCall } from "../../../libs/agent/types.js";
import { agentFormatter } from "../../../libs/formatters/index.js";
import type { AgentWidgetPart } from "../../../types/response.js";
import type { ServiceFn } from "../../../utils/services/types.js";
import addedReferencesWidget from "./added-references-widget.js";
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
			/** The chat and when the call started, to show the references it linked. */
			linked?: { conversationId: string; since: string };
		},
	],
	"completed"
> = async (context, { call, checkpoint, session, outcome, linked }) => {
	const { output, summary, changes, failed } = outcome;

	const status = failed ? "failed" : "complete";

	const part = settleToolCall(checkpoint, call, {
		status,
		output,
		summary,
		changes,
	});

	//* a grouped confirmation stays pending until every call it covers has a receipt
	const confirmations = checkpoint.pending?.widget.interaction.confirmations;
	const confirmationsSettled =
		!confirmations ||
		confirmations.every((confirmation) =>
			isToolCallComplete(checkpoint, confirmation.toolCallId),
		);
	if (confirmationsSettled) checkpoint.pending = undefined;

	advanceToolCursor(checkpoint);

	const widgets: AgentWidgetPart[] = failed
		? []
		: (outcome.widgets ?? []).map(({ key, version, data }) => ({
				type: "widget",
				key,
				version,
				data,
			}));
	if (linked && !failed) {
		const references = await addedReferencesWidget(context, {
			...linked,
			parts: [...checkpoint.parts, ...widgets],
		});
		if (references.error) return references;
		if (references.data) widgets.push(references.data);
	}
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
