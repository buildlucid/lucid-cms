import constants from "../../constants/constants.js";
import formatter, { agentFormatter } from "../../libs/formatters/index.js";
import {
	AgentConversationsRepository,
	AgentMessagesRepository,
	AgentRunsRepository,
} from "../../libs/repositories/index.js";
import type { AgentStreamEvent } from "../../types/response.js";
import type { ServiceFn } from "../../utils/services/types.js";
import getInputs from "./get-inputs.js";

const wait = (ms: number, signal: AbortSignal) =>
	new Promise<void>((resolve) => {
		const timer = setTimeout(resolve, ms);
		signal.addEventListener(
			"abort",
			() => {
				clearTimeout(timer);
				resolve();
			},
			{ once: true },
		);
	});

/**
 * Streams a run's saved replies while a background worker executes it. Ends once
 * the run stops working, or after one slice so the client reconnects.
 */
const watchRun: ServiceFn<
	[
		{
			runId: string;
			signal: AbortSignal;
			emit: (event: AgentStreamEvent) => Promise<void>;
		},
	],
	undefined
> = async (context, input) => {
	const AgentRuns = new AgentRunsRepository(context.db);
	const AgentMessages = new AgentMessagesRepository(context.db);
	const AgentConversations = new AgentConversationsRepository(context.db);
	const deadline = Date.now() + constants.agent.sliceMs;
	const sent = new Map<string, string>();
	let since: string | undefined;
	let lastContext: string | undefined;
	let lastInputs: string | undefined;

	while (!input.signal.aborted && Date.now() < deadline) {
		// Status is read first so the final reply is always sent before finish.
		const run = await AgentRuns.selectSingle({
			select: ["status", "conversation_id"],
			where: [{ key: "id", operator: "=", value: input.runId }],
		});
		if (run.error) return run;
		if (!run.data) break;

		const messages = await AgentMessages.selectChangedForRun({
			runId: input.runId,
			since,
		});
		if (messages.error) return messages;

		for (const message of messages.data) {
			const updatedAt = formatter.formatDate(message.updated_at);
			if (sent.get(message.id) === updatedAt) continue;

			sent.set(message.id, updatedAt);
			if (since === undefined || updatedAt > since) since = updatedAt;
			await input.emit({
				type: "message",
				message: agentFormatter.formatMessage({ message }),
			});
		}

		const conversation = await AgentConversations.selectSingle({
			select: ["context", "active_run_id", "queue_paused"],
			where: [{ key: "id", operator: "=", value: run.data.conversation_id }],
		});
		if (conversation.error) return conversation;

		const usage = agentFormatter.formatContext({
			context: conversation.data?.context ?? null,
			active: conversation.data?.active_run_id === input.runId,
		});
		if (usage && JSON.stringify(usage) !== lastContext) {
			lastContext = JSON.stringify(usage);
			await input.emit({ type: "context", runId: input.runId, context: usage });
		}

		const inputs = await getInputs(context, {
			conversationId: run.data.conversation_id,
		});
		if (inputs.error) return inputs;

		const queue = {
			type: "inputs" as const,
			inputs: inputs.data,
			queuePaused: Boolean(conversation.data?.queue_paused),
		};
		if (JSON.stringify(queue) !== lastInputs) {
			lastInputs = JSON.stringify(queue);
			await input.emit(queue);
		}

		const status = run.data.status;
		if (!constants.agent.runStatuses.working.some((s) => s === status)) {
			await input.emit({ type: "finish", runId: input.runId, status });
			const next = conversation.data?.active_run_id;
			if (next && next !== input.runId) {
				await input.emit({ type: "next", runId: next });
			}
			break;
		}

		await wait(constants.agent.watchIntervalMs, input.signal);
	}

	return { error: undefined, data: undefined };
};

export default watchRun;
