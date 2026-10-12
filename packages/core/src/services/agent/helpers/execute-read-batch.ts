import {
	needsConfirmation,
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
import requestBatchConfirmation from "./request-batch-confirmation.js";
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
		screen: checkpoint.screen,
	});

	const attended = authority.principal.type === "user";
	const first = batch[0];
	if (
		attended &&
		!checkpoint.pending &&
		first &&
		needsConfirmation({
			checkpoint,
			tool: first.tool,
			input: first.call.input,
			config: context.config,
		})
	) {
		return requestBatchConfirmation(context, {
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
		if (
			needsConfirmation({
				checkpoint,
				tool,
				input: call.input,
				config: context.config,
			}) &&
			!answer
		) {
			return toolFailure(
				context.translate(
					attended
						? "server:agent.tool.unavailable"
						: "server:agent.tool.confirmation.unattended",
				),
			);
		}

		const outcome = await invokeAgentTool(context, {
			call,
			tool,
			execution: executionFor(call),
			messageId: checkpoint.messageId,
			emit: session.emit,
		});
		//* Parallel read batches cannot pause for interactions.
		return outcome.kind === "result"
			? outcome
			: toolFailure(context.translate("server:agent.tool.unavailable"));
	};

	//* reads run together, so each records the references linked since the batch started that the reply does not show yet
	const linked = {
		conversationId: run.conversation_id,
		since: new Date().toISOString(),
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
			linked,
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
