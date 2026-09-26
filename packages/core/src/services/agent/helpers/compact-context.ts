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
import reconcileUsage from "../reconcile-usage.js";
import type resolveCapabilities from "./resolve-capabilities.js";
import type { RunSession, SessionRun } from "./run-session.js";
import storePendingUsage from "./store-pending-usage.js";
import storeUsage from "./store-usage.js";
import streamModelTurn from "./stream-model-turn.js";

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
			capabilities: ReturnType<typeof resolveCapabilities>;
		},
	],
	boolean
> = async (context, { run, checkpoint, session, capabilities }) => {
	if (!checkpoint.compaction) {
		const limit = tokenLimit(checkpoint);
		const count = compactionCut(checkpoint.messages, {
			retain: limit * contextLimits.retainAt,
			//* the summary request repeats the instructions and tools, so they share the budget
			max:
				limit * contextLimits.compactAt -
				estimateTokens(capabilities.instructions) -
				estimateTokens(capabilities.definitions),
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
	await session.saveContext(capabilities, "compacting");

	const record = {
		requestId: pending.requestId,
		purpose: "compact" as const,
		runId: run.id,
		conversationId: run.conversation_id,
		userId: run.user_id,
	};
	let summary = "";
	const started = Date.now();

	//* same instructions, tools and leading messages as the chat, so the provider's prompt cache applies
	const result = await streamModelTurn(context, {
		requestId: pending.requestId,
		purpose: "compact",
		instructions: capabilities.instructions,
		messages: modelMessages(checkpoint.messages.slice(0, pending.count)),
		tools: capabilities.definitions,
		signal: session.signal,
		onRequest: (connectionId) =>
			storePendingUsage(context, { ...record, connectionId }),
		emit: async (event) => {
			if (event.type === "start")
				checkpoint.model = {
					id: event.model,
					tokenLimit: event.inputTokenLimit,
				};
			if (event.type === "text-delta") summary += event.text;
		},
	});
	if (result.error) {
		if (!session.signal.aborted) {
			await reconcileUsage(context, { requestId: pending.requestId });
		}

		return result;
	}

	const usage = await storeUsage(context, {
		...record,
		connectionId: result.data.connectionId,
		usage: result.data.usage,
		durationMs: Date.now() - started,
	});
	if (usage.error) return usage;
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

	await session.saveContext(capabilities, "ready");
	return { error: undefined, data: true };
};

export default compactContext;
