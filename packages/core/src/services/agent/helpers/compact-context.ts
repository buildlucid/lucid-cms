import { randomUUID } from "node:crypto";
import {
	compactionCut,
	contextLimits,
	contextTokens,
	estimateTokens,
	modelMessages,
	needsCompaction,
	reportedModel,
	summaryMessage,
	tokenLimit,
} from "../../../libs/agent/context.js";
import type { Checkpoint } from "../../../libs/agent/types.js";
import { copy } from "../../../libs/i18n/index.js";
import { AgentMessagesRepository } from "../../../libs/repositories/index.js";
import type {
	ServiceContext,
	ServiceFn,
} from "../../../utils/services/types.js";
import isPermanentFailure from "./is-permanent-failure.js";
import type { RunSetup } from "./resolve-run-setup.js";
import type { RunSession, SessionRun } from "./run-session.js";
import runnerRequestRecord from "./runner-request-record.js";
import streamModelTurn from "./stream-model-turn.js";
import trackPaidRequest from "./track-paid-request.js";

type CompactionProps = {
	run: SessionRun;
	checkpoint: Checkpoint;
	session: RunSession;
	setup: RunSetup;
};

type CompactionResult =
	| { kind: "ready" }
	| { kind: "continue" }
	| { kind: "aborted" }
	| {
			kind: "stop";
			status: "completed" | "failed" | "interrupted";
			message?: string;
	  };

/**
 * Summarises older context into one message and keeps recent messages verbatim.
 * The request id is saved first, so an interrupted compaction resumes without
 * paying twice. Returns false when there is nothing to summarise.
 */
const summariseContext: ServiceFn<[CompactionProps], boolean> = async (
	context,
	{ run, checkpoint, session, setup },
) => {
	if (!checkpoint.compaction) {
		const limit = tokenLimit(checkpoint);
		const count = compactionCut(checkpoint.messages, {
			retain: limit * contextLimits.retainAt,
			//* the summary request repeats the instructions and tools, so they share the budget
			max:
				limit * contextLimits.compactAt -
				estimateTokens(setup.instructions) -
				estimateTokens(setup.definitions) -
				(checkpoint.model?.instructionTokens ?? 0),
		});
		const sourceId = checkpoint.messages[count - 1]?.sourceId;
		if (!count || !sourceId) return { error: undefined, data: false };

		const messages = new AgentMessagesRepository(context.db);
		const source = await messages.selectSingle({
			select: ["position"],
			where: [
				{ key: "id", operator: "=", value: sourceId },
				{ key: "conversation_id", operator: "=", value: run.conversation_id },
			],
		});
		if (source.error) return source;
		if (!source.data) return { error: undefined, data: false };

		checkpoint.compaction = {
			requestId: randomUUID(),
			count,
			throughPosition: source.data.position,
		};
		const saved = await session.save();
		if (saved.error) return saved;
	}

	const pending = checkpoint.compaction;
	await session.saveContext(setup, "compacting");

	let summary = "";

	//* same instructions, tools and leading messages as the chat, so the provider's prompt cache applies
	const result = await trackPaidRequest(context, {
		record: runnerRequestRecord(run, {
			requestId: pending.requestId,
			featureKey: "agent.compact",
		}),
		signal: session.signal,
		send: (start) =>
			streamModelTurn(context, {
				requestId: pending.requestId,
				sessionId: run.conversation_id,
				purpose: "compact",
				instructions: setup.instructions,
				selection: checkpoint.selection,
				messages: modelMessages(checkpoint.messages.slice(0, pending.count)),
				tools: setup.definitions,
				signal: session.signal,
				onRequest: start,
				emit: async (event) => {
					if (event.type === "start") checkpoint.model = reportedModel(event);
					if (event.type === "text-delta") summary += event.text;
				},
			}),
	});
	if (result.error) return result;
	if (!summary.trim()) {
		return {
			data: undefined,
			error: {
				type: "basic",
				status: 502,
				key: "agent_compaction_failed",
				message: copy("server:agent.compaction.failed"),
			},
		};
	}

	const previous = {
		messages: checkpoint.messages,
		measured: checkpoint.measured,
		trimmed: checkpoint.trimmed,
	};
	//* the request this run answers stays verbatim, so the reply still addresses it
	const request = previous.messages
		.slice(0, pending.count)
		.filter(
			(message) => message.role === "user" && message.sourceId === run.id,
		);
	checkpoint.messages = [
		summaryMessage(summary),
		...request,
		...previous.messages.slice(pending.count),
	];
	checkpoint.compaction = undefined;
	checkpoint.measured = undefined;
	checkpoint.trimmed = true;

	let committed = false;
	try {
		const stored = await session.storeCompaction({
			id: pending.requestId,
			summary,
			throughPosition: pending.throughPosition,
		});
		if (stored.error) return stored;
		committed = true;
	} finally {
		if (!committed) {
			checkpoint.messages = previous.messages;
			checkpoint.compaction = pending;
			checkpoint.measured = previous.measured;
			checkpoint.trimmed = previous.trimmed;
		}
	}

	await session.saveContext(setup, "ready");
	return { error: undefined, data: true };
};

/**
 * Compacts context before a model request when a person asked, when saved
 * history cannot load or the API rejected the request as too large, or when
 * context nears the model's limit. Automatic compaction is best effort while
 * the request still fits. `historyFull` means saved history stopped loading
 * for lack of room.
 */
const compactContext = async (
	context: ServiceContext,
	props: CompactionProps & { historyFull: boolean },
): Promise<CompactionResult> => {
	const { checkpoint, session, setup } = props;
	const manual =
		checkpoint.purpose === "compact" && checkpoint.historyAfter === undefined;
	//* compaction is required to keep going, rather than just due
	const required = props.historyFull || checkpoint.overflow === "compacting";
	const due =
		!checkpoint.compactionFailed && needsCompaction(checkpoint, setup);
	if (!checkpoint.compaction && !manual && !required && !due) {
		return { kind: "ready" };
	}

	const compacted = await summariseContext(context, props);
	if (compacted.error) {
		if (session.signal.aborted) return { kind: "aborted" };

		if (
			!manual &&
			!required &&
			contextTokens(checkpoint, setup) <= tokenLimit(checkpoint)
		) {
			checkpoint.compaction = undefined;
			checkpoint.compactionFailed = true;
			await session.saveContext(setup, "ready");
			return { kind: "continue" };
		}

		const permanent =
			compacted.error.key === "agent_compaction_failed" ||
			compacted.error.key === "agent_context_exceeded" ||
			(await isPermanentFailure(context, {
				error: compacted.error,
				requestId: checkpoint.compaction?.requestId,
			}));

		return {
			kind: "stop",
			status: permanent ? "failed" : "interrupted",
			message: context.translate("server:agent.compaction.failed"),
		};
	}

	if (manual) return { kind: "stop", status: "completed" };

	if (compacted.data) {
		if (checkpoint.overflow) checkpoint.overflow = "retrying";
		return { kind: "continue" };
	}

	if (required) {
		return {
			kind: "stop",
			status: "failed",
			message: context.translate("server:agent.conversation.too.large"),
		};
	}

	return { kind: "ready" };
};

export default compactContext;
