import {
	needsApproval,
	toolInteractionAnswer,
} from "../../../libs/agent/interactions.js";
import type { Checkpoint, ToolCall } from "../../../libs/agent/types.js";
import type {
	AgentToolAuthority,
	AgentToolExecution,
} from "../../../libs/tools/types.js";
import type { ServiceFn } from "../../../utils/services/types.js";
import type { ReadCall } from "./get-read-batch.js";
import invokeAgentTool from "./invoke-agent-tool.js";
import recordToolResult from "./record-tool-result.js";
import requestBatchApproval from "./request-batch-approval.js";
import type { RunSession, SessionRun } from "./run-session.js";
import { type ToolResult, toolFailure } from "./tool-outcome.js";

type Completion = { call: ToolCall } & (
	| { outcome: ToolResult }
	| { error: unknown }
);

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
		actor:
			authority.principal.type === "user"
				? {
						kind: "user",
						userId: authority.principal.userId,
						agentRunId: run.id,
					}
				: { kind: "system", agentRunId: run.id },
		signal: session.signal,
		operationId: `${run.id}:${call.id}`,
		run: {
			id: run.id,
			conversationId: run.conversation_id,
			userId: run.user_id,
			agentKey: run.agent_key,
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
