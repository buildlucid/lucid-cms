import constants from "../../../constants/constants.js";
import { isToolCallComplete } from "../../../libs/agent/context.js";
import {
	createInteraction,
	needsApproval,
	toolInteractionAnswer,
} from "../../../libs/agent/interactions.js";
import type { Checkpoint, ToolCall } from "../../../libs/agent/types.js";
import { preflightAgentTool } from "../../../libs/tools/execute-tool.js";
import type {
	AgentToolAuthority,
	AgentToolDefinition,
	AgentToolExecution,
} from "../../../libs/tools/types.js";
import type {
	ServiceContext,
	ServiceFn,
	ServiceResponse,
} from "../../../utils/services/types.js";
import invokeAgentTool, { failedToolRun } from "./invoke-agent-tool.js";
import recordToolResult from "./record-tool-result.js";
import type { RunSetup } from "./resolve-run-setup.js";
import type { RunSession, SessionRun } from "./run-session.js";
import { type ToolResult, toolFailure } from "./tool-outcome.js";

type ReadCall = { call: ToolCall; tool: AgentToolDefinition };
type Completion = { call: ToolCall } & (
	| { outcome: ToolResult }
	| { error: unknown }
);

/** A bounded group stops at stateful tools, policy changes and the end of a saved approval. */
export const getReadBatch = (props: {
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

/**
 * Checks each call before asking, then saves one approval covering the calls
 * that can run. Fewer than two leaves the rest to the single-call path.
 */
const requestBatchApproval = async (
	context: ServiceContext,
	props: {
		checkpoint: Checkpoint;
		session: RunSession;
		batch: ReadCall[];
		executionFor: (call: ToolCall) => AgentToolExecution;
	},
): ServiceResponse<"completed" | "waiting"> => {
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
			title: context.translate(tool.title),
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

/** Independent invocations never touch the checkpoint; this coordinator saves each completion as it arrives. */
const executeReadBatch: ServiceFn<
	[
		{
			run: SessionRun;
			checkpoint: Checkpoint;
			session: RunSession;
			authority: AgentToolAuthority;
			batch: ReadCall[];
		},
	],
	"completed" | "waiting"
> = async (context, { run, checkpoint, session, authority, batch }) => {
	const executionFor = (call: ToolCall): AgentToolExecution => ({
		authority,
		signal: session.signal,
		operationId: `${run.id}:${call.id}`,
		run: {
			id: run.id,
			conversationId: run.conversation_id,
			userId: run.user_id,
		},
	});

	const first = batch[0];
	if (!checkpoint.pending && first && needsApproval(checkpoint, first.tool)) {
		return requestBatchApproval(context, {
			checkpoint,
			session,
			batch,
			executionFor,
		});
	}

	const invoke = async ({ call, tool }: ReadCall): Promise<ToolResult> => {
		const answer = toolInteractionAnswer(checkpoint, call);

		if (answer?.action === "cancel") {
			return toolFailure(context.translate("server:agent.tool.denied"));
		}
		if (needsApproval(checkpoint, tool) && !answer) {
			return toolFailure(context.translate("server:agent.tool.unavailable"));
		}

		return invokeAgentTool(context, {
			call,
			tool,
			execution: executionFor(call),
			messageId: checkpoint.messageId,
			emit: session.emit,
		});
	};

	const running = new Map<string, Promise<Completion>>();
	for (const read of batch) {
		running.set(
			read.call.id,
			invoke(read).then(
				(outcome) => ({ call: read.call, outcome }),
				(error: unknown) => ({ call: read.call, error }),
			),
		);
	}

	let thrown: { error: unknown } | undefined;

	while (running.size) {
		const completed = await Promise.race(running.values());
		running.delete(completed.call.id);

		if ("error" in completed) {
			thrown = completed;
			continue;
		}
		// An aborted read has no durable result. Successful siblings still survive recovery.
		if (session.signal.aborted && completed.outcome.failed) continue;

		const saved = await recordToolResult(context, {
			call: completed.call,
			outcome: completed.outcome,
			checkpoint,
			session,
		});
		if (saved.error) {
			await Promise.all(running.values());
			return saved;
		}
	}

	if (thrown) throw thrown.error;

	return { error: undefined, data: "completed" };
};

export default executeReadBatch;
