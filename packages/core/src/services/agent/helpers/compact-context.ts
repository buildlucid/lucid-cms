import { randomUUID } from "node:crypto";
import {
	compactionCut,
	contextLimits,
	estimateTokens,
	modelMessages,
	summaryMessage,
	tokenLimit,
} from "../../../libs/agent/context.js";
import type { Checkpoint } from "../../../libs/agent/types.js";
import { copy } from "../../../libs/i18n/index.js";
import { AgentMessagesRepository } from "../../../libs/repositories/index.js";
import type { ServiceFn } from "../../../utils/services/types.js";
import type resolveRunSetup from "./resolve-run-setup.js";
import type { RunSession, SessionRun } from "./run-session.js";
import streamModelTurn from "./stream-model-turn.js";
import trackPaidRequest, {
	type PaidRequestRecord,
} from "./track-paid-request.js";

/**
 * Summarises older context into one message and keeps recent messages verbatim.
 * The request id is saved first, so an interrupted compaction resumes without
 * paying twice. Returns false when there is nothing to summarise.
 */
const compactContext: ServiceFn<
	[
		{
			run: SessionRun;
			checkpoint: Checkpoint;
			session: RunSession;
			setup: ReturnType<typeof resolveRunSetup>;
		},
	],
	boolean
> = async (context, { run, checkpoint, session, setup }) => {
	if (!checkpoint.compaction) {
		const limit = tokenLimit(checkpoint);
		const count = compactionCut(checkpoint.messages, {
			retain: limit * contextLimits.retainAt,
			//* the summary request repeats the instructions and tools, so they share the budget
			max:
				limit * contextLimits.compactAt -
				estimateTokens(setup.instructions) -
				estimateTokens(setup.definitions),
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

	const record: PaidRequestRecord = {
		requestId: pending.requestId,
		featureKey: "agent.compact",
		runId: run.id,
		conversationId: run.conversation_id,
		userId: run.user_id,
	};
	let summary = "";

	//* same instructions, tools and leading messages as the chat, so the provider's prompt cache applies
	const result = await trackPaidRequest(context, {
		record,
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
					if (event.type === "start")
						checkpoint.model = {
							id: event.model,
							tokenLimit: event.inputTokenLimit,
							toolLimit: event.toolLimit,
						};
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

export default compactContext;
