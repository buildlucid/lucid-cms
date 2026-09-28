import { randomUUID } from "node:crypto";
import constants from "../../../constants/constants.js";
import { modelMessages } from "../../../libs/agent/context.js";
import type { Checkpoint, ModelEvent } from "../../../libs/agent/types.js";
import { AiGenerationsRepository } from "../../../libs/repositories/index.js";
import type { ServiceFn } from "../../../utils/services/types.js";
import type resolveCapabilities from "./resolve-capabilities.js";
import type { RunSession, SessionRun } from "./run-session.js";
import streamModelTurn from "./stream-model-turn.js";
import textFromParts from "./text-from-parts.js";
import trackPaidRequest from "./track-paid-request.js";

type TurnResult =
	| { kind: "continue" }
	| { kind: "aborted" }
	/** The model could not read the whole request, so compact and try again. */
	| { kind: "overflow" }
	| { kind: "stop"; status: "failed" | "interrupted"; message: string };

/** Streams one billed model turn into the checkpoint and records its usage. */
const runModelTurn: ServiceFn<
	[
		{
			run: SessionRun;
			checkpoint: Checkpoint;
			session: RunSession;
			capabilities: ReturnType<typeof resolveCapabilities>;
		},
	],
	TurnResult
> = async (context, { run, checkpoint, session, capabilities }) => {
	const { limits } = constants.agent;
	checkpoint.parts = [];
	checkpoint.calls = [];
	checkpoint.cursor = 0;

	// Saving the request id first lets a resumed worker replay this turn rather than pay for it twice.
	const reset = await session.save();
	if (reset.error) return reset;

	await session.emit({
		type: "start",
		runId: run.id,
		messageId: checkpoint.messageId,
	});

	const stop = new AbortController();
	let tooLarge = false;
	//* approximate serialised size, tracked incrementally rather than re-stringifying every delta
	let partsSize = 0;
	let saveError: Awaited<ReturnType<RunSession["save"]>>["error"];
	const usageRecord = {
		featureKey: "agent.chat",
		requestId: checkpoint.requestId,
		runId: run.id,
		conversationId: run.conversation_id,
		userId: run.user_id,
	};
	let savedAt = Date.now();

	const onEvent = async (event: ModelEvent) => {
		if (event.type === "start") {
			checkpoint.model = {
				id: event.model,
				tokenLimit: event.inputTokenLimit,
				toolLimit: event.toolLimit,
			};
		} else if (event.type === "text-delta") {
			const last = checkpoint.parts.at(-1);

			if (last?.type === "text") {
				last.text += event.text;
			} else {
				checkpoint.parts.push({ type: "text", text: event.text });
			}
			partsSize += event.text.length;

			await session.emit({
				type: "text-delta",
				messageId: checkpoint.messageId,
				text: event.text,
			});
		} else if (event.type === "tool-call") {
			const call = { id: event.id, name: event.name, input: event.input };
			const part = {
				type: "tool" as const,
				...call,
				title: capabilities.titles.get(call.name),
				status: "pending" as const,
			};
			checkpoint.calls.push(call);
			checkpoint.parts.push(part);
			partsSize += JSON.stringify(part).length;
			await session.emit({ messageId: checkpoint.messageId, ...part });
		}
		if (partsSize > limits.partsChars) {
			tooLarge = true;
			stop.abort();
		}
		if (Date.now() - savedAt > constants.agent.replySaveIntervalMs) {
			savedAt = Date.now();
			saveError = (await session.saveReply()).error;

			if (saveError) stop.abort();
		}
	};

	const sent = checkpoint.messages.length;
	const response = await trackPaidRequest(context, {
		record: usageRecord,
		signal: session.signal,
		send: (start) =>
			streamModelTurn(context, {
				requestId: checkpoint.requestId,
				sessionId: run.conversation_id,
				instructions: capabilities.instructions,
				selection: checkpoint.selection,
				messages: modelMessages(checkpoint.messages),
				tools: capabilities.definitions,
				signal: AbortSignal.any([session.signal, stop.signal]),
				onRequest: start,
				emit: onEvent,
			}),
	});

	if (response.error) {
		if (session.signal.aborted) {
			// The remote request was cancelled with this worker, so the next worker asks again.
			checkpoint.requestId = randomUUID();

			return { error: undefined, data: { kind: "aborted" } };
		}
		if (saveError) return { data: undefined, error: saveError };
		if (tooLarge) {
			return {
				error: undefined,
				data: {
					kind: "stop",
					status: "failed",
					message: context.translate("server:agent.response.too.large"),
				},
			};
		}

		if (response.error.key === "agent_context_exceeded") {
			if (checkpoint.overflow === "retrying") {
				return {
					error: undefined,
					data: {
						kind: "stop",
						status: "failed",
						message: context.translate("server:agent.conversation.too.large"),
					},
				};
			}

			//* nothing was charged, and the retry needs its own request
			checkpoint.overflow = "compacting";
			checkpoint.requestId = randomUUID();
			return { error: undefined, data: { kind: "overflow" } };
		}
		const AiGenerations = new AiGenerationsRepository(context.db);

		const usage = await AiGenerations.selectSingleByRequestId({
			requestId: checkpoint.requestId,
			select: ["status"],
		});
		const permanent =
			(response.error.key === "agent_model_failed" &&
				usage.data?.status === "failed") ||
			(response.error.status !== undefined &&
				response.error.status < 500 &&
				response.error.status !== 409);

		return {
			error: undefined,
			data: {
				kind: "stop",
				status: permanent ? "failed" : "interrupted",
				message:
					context.translate(response.error.message) ??
					context.translate("server:agent.request.interrupted"),
			},
		};
	}

	checkpoint.messages.push({
		sourceId: checkpoint.messageId,
		role: "assistant",
		content: textFromParts(checkpoint.parts),
		reasoningDetails: response.data.reasoningDetails,
		...(checkpoint.calls.length ? { toolCalls: checkpoint.calls } : {}),
	});
	checkpoint.measured = {
		tokens: response.data.usage.tokens.input.total,
		messages: sent,
	};
	checkpoint.overflow = undefined;
	checkpoint.phase = "tools";

	const saved = await session.save();
	if (saved.error) return saved;
	await session.saveContext(capabilities, "ready");

	return { error: undefined, data: { kind: "continue" } };
};

export default runModelTurn;
