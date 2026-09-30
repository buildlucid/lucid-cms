import constants from "../../constants/constants.js";
import { isWorkingRunStatus } from "../../libs/agent/run-status.js";
import {
	findRunStream,
	parseStreamCursor,
	type RunStream,
	type SavedMessageCursor,
	savedStreamCursor,
} from "../../libs/agent/run-stream.js";
import { agentFormatter } from "../../libs/formatters/index.js";
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
		if (signal.aborted) return resolve();
		const done = () => {
			clearTimeout(timer);
			signal.removeEventListener("abort", done);
			resolve();
		};
		const timer = setTimeout(done, ms);
		signal.addEventListener("abort", done, { once: true });
	});

/** Replays a live buffer from a cursor. Returns true once the run finished, or false when a gap needs snapshots. */
const replayLive = async (props: {
	stream: RunStream;
	cursor: string;
	signal: AbortSignal;
	emit: (event: AgentStreamEvent, id?: string) => Promise<void>;
}) => {
	const { stream, signal } = props;
	let cursor = props.cursor;
	let finished = false;

	while (!signal.aborted) {
		const entries = stream.read(cursor);
		if (!entries) return false;

		for (const entry of entries) {
			if (signal.aborted) break;

			await props.emit(entry.event, entry.id);
			cursor = entry.id;
			if (entry.event.type === "finish" || entry.event.type === "error") {
				finished = true;
			}
		}

		// Events may arrive while a slow viewer writes. Drain those before waiting.
		const remaining = stream.read(cursor);
		if (!remaining) return false;
		if (remaining.length) continue;
		if (!stream.active) return finished;

		await stream.wait(signal);
	}

	return false;
};

/**
 * Streams a run's saved replies while a background worker executes it. Ends once
 * the run stops working, or after one slice so the client reconnects.
 */
const watchRun: ServiceFn<
	[
		{
			runId: string;
			cursor?: string;
			signal: AbortSignal;
			emit: (event: AgentStreamEvent, id?: string) => Promise<void>;
		},
	],
	undefined
> = async (context, input) => {
	const emit = input.emit;
	const AgentRuns = new AgentRunsRepository(context.db);
	const AgentMessages = new AgentMessagesRepository(context.db);
	const AgentConversations = new AgentConversationsRepository(context.db);
	const deadline = Date.now() + constants.agent.sliceMs;
	const signal = AbortSignal.any([
		input.signal,
		AbortSignal.timeout(constants.agent.sliceMs),
	]);
	const parsed = parseStreamCursor(input.cursor);
	let cursor: SavedMessageCursor | undefined =
		parsed?.kind === "saved" && parsed.runId === input.runId
			? parsed
			: undefined;
	let lastContext: string | undefined;
	let lastInputs: string | undefined;

	// Only a live cursor can safely replay deltas. Other workers and buffer gaps use replacing snapshots.
	const stream =
		parsed?.kind === "live"
			? findRunStream(context.config, input.runId)
			: undefined;
	if (stream && input.cursor) {
		const finished = await replayLive({
			stream,
			cursor: input.cursor,
			signal,
			emit,
		});
		if (finished) return { error: undefined, data: undefined };
	}

	while (!signal.aborted && Date.now() < deadline) {
		// Status is read first so the final reply is always sent before finish.
		const run = await AgentRuns.selectSingle({
			select: ["status", "conversation_id"],
			where: [{ key: "id", operator: "=", value: input.runId }],
		});
		if (run.error) return run;
		if (!run.data) break;

		const version = await AgentMessages.selectRunVersion(input.runId);
		if (version.error) return version;
		if (
			version.data &&
			(!cursor ||
				version.data.execution_version > cursor.executionVersion ||
				(version.data.execution_version === cursor.executionVersion &&
					version.data.revision > cursor.revision))
		) {
			// Fetch against the cursor again: writes may have advanced since the version check.
			const messages = await AgentMessages.selectChangedForRun({
				runId: input.runId,
				cursor,
			});
			if (messages.error) return messages;
			for (const message of messages.data) {
				cursor = {
					executionVersion: message.execution_version,
					revision: message.revision,
				};
				await emit(
					{
						type: "message",
						message: agentFormatter.formatMessage({ message }),
					},
					savedStreamCursor(input.runId, cursor),
				);
			}
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
			await emit({ type: "context", runId: input.runId, context: usage });
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
			await emit(queue);
		}

		const status = run.data.status;
		if (!isWorkingRunStatus(status)) {
			if (status === "completed") {
				const results = await AgentRuns.selectResults([input.runId]);
				if (results.error) return results;

				const [completed] = results.data;
				const result =
					completed && agentFormatter.formatRunResult({ run: completed });
				if (result) await emit({ messageId: input.runId, ...result });
			}
			await emit({ type: "finish", runId: input.runId, status });
			const next = conversation.data?.active_run_id;
			if (next && next !== input.runId) {
				await emit({ type: "next", runId: next });
			}
			break;
		}

		await wait(constants.agent.watchIntervalMs, signal);
	}

	return { error: undefined, data: undefined };
};

export default watchRun;
