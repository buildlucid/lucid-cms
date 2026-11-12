import { plain } from "./generate.ts";
import { modelFor } from "./models.ts";
import {
	decodeScript,
	encodeScript,
	SCRIPT_END_REPLY,
	type Script,
	type ScriptTurn,
} from "./script.ts";
import type { FakeConnection, FakeState } from "./state.ts";
import type { AgentEntry } from "./types.ts";
import { modelUsage, remoteError } from "./usage.ts";

type ModelMessage = {
	role: "user" | "assistant" | "tool";
	content?: string;
	toolCalls?: Array<{ id: string; name: string }>;
	toolCallId?: string;
};

type AgentRequestBody = {
	requestId: string;
	sessionId: string;
	actor: AgentEntry["actor"];
	selection?: { modelId: string };
	purpose?: "compact";
	instructions: string;
	messages: ModelMessage[];
	tools: Array<{ name: string }>;
};

/** The summary a compaction answers with, before the script it carries on with. */
export const COMPACTION_SUMMARY = "Summary of the earlier conversation.";

const frame = (event: Record<string, unknown>) =>
	`data: ${JSON.stringify(event)}\n\n`;

/**
 * Validates transcript ordering: each tool call needs exactly one result immediately after its
 * originating message, before further messages.
 */
export const findTranscriptViolation = (
	messages: ModelMessage[],
): string | null => {
	const seen = new Set<string>();
	let pending = new Set<string>();

	for (const [index, message] of messages.entries()) {
		if (message.role === "tool") {
			const id = message.toolCallId ?? "";
			if (!pending.delete(id)) {
				return `Message ${index} answers tool call ${id}, which is not waiting for a result.`;
			}
			continue;
		}
		if (pending.size > 0) {
			return `Message ${index} comes before tool calls ${[...pending].join(", ")} have results.`;
		}
		if (message.role === "assistant") {
			pending = new Set();
			for (const call of message.toolCalls ?? []) {
				if (seen.has(call.id)) {
					return `Tool call ${call.id} is made twice.`;
				}
				seen.add(call.id);
				pending.add(call.id);
			}
		}
	}
	return pending.size > 0
		? `Tool calls ${[...pending].join(", ")} have no results.`
		: null;
};

/**
 * Selects the newest user-message script, falling back to instructions, and determines the next
 * turn from subsequent replies.
 */
export const findTurn = (
	body: Pick<AgentRequestBody, "messages" | "instructions">,
): { script: Script; index: number } | null => {
	for (let i = body.messages.length - 1; i >= 0; i--) {
		const message = body.messages[i];
		if (message?.role !== "user") {
			continue;
		}
		const found = decodeScript(message.content ?? "");
		if (found) {
			const replies = body.messages
				.slice(i + 1)
				.filter((later) => later.role === "assistant").length;
			return { script: found, index: replies };
		}
	}
	const fromInstructions = decodeScript(body.instructions);
	return fromInstructions
		? {
				script: fromInstructions,
				index: body.messages.filter((message) => message.role === "assistant")
					.length,
			}
		: null;
};

/** What a request without a script hears back, so a person typing in a browser test gets an answer. */
const unscriptedTurn = (messages: ModelMessage[]): ScriptTurn => {
	const last = messages.findLast((message) => message.role === "user");
	return { text: `You said: ${plain(last?.content ?? "").slice(0, 200)}` };
};

/**
 * Carries remaining script turns into compaction summaries so runs resume after history
 * replacement.
 */
const compactionTurn = (body: AgentRequestBody): ScriptTurn => {
	const found = findTurn(body);
	if (!found) {
		return { text: COMPACTION_SUMMARY };
	}
	const rest: Script = {
		id: found.script.id,
		offset: found.script.offset + found.index,
		turns: found.script.turns.slice(found.index),
	};
	return { text: `${COMPACTION_SUMMARY} ${encodeScript(rest)}` };
};

/** Lucid's model endpoint, answering from the request's script. */
const createAgent = (state: FakeState) => {
	const stream = (
		request: Request,
		frames: (push: (event: Record<string, unknown>) => void) => Promise<void>,
	) => {
		const body = new ReadableStream<Uint8Array>({
			start: async (controller) => {
				const encoder = new TextEncoder();
				try {
					await frames((event) =>
						controller.enqueue(encoder.encode(frame(event))),
					);
				} finally {
					controller.close();
				}
			},
		});
		return new Response(request.signal.aborted ? null : body, {
			headers: {
				"content-type": "text/event-stream",
				"cache-control": "no-cache",
			},
		});
	};

	const answer = async (
		request: Request,
		connection: FakeConnection,
	): Promise<Response> => {
		const raw = await request.text();
		const body = JSON.parse(raw) as AgentRequestBody;
		const model = modelFor(body.selection?.modelId);
		const purpose = body.purpose === "compact" ? "compact" : "chat";
		const found = purpose === "chat" ? findTurn(body) : null;
		const entry: Omit<AgentEntry, "outcome" | "creditsCharged" | "calls"> & {
			at: string;
		} = {
			kind: "agent",
			at: new Date().toISOString(),
			requestId: body.requestId,
			sessionId: body.sessionId,
			purpose,
			scriptId: found?.script.id ?? null,
			turn: found ? found.script.offset + found.index : null,
			model: model.id,
			actor: body.actor,
			instructions: body.instructions,
			messages: body.messages,
			tools: body.tools.map((tool) => tool.name),
			requestChars: raw.length,
		};
		const record = (
			outcome: AgentEntry["outcome"],
			extra?: Partial<AgentEntry>,
		) =>
			state.record(connection, {
				...entry,
				outcome,
				creditsCharged: 0,
				calls: [],
				...extra,
			});

		//* a request sent again gets the answer it already had, without paying twice
		const finished = state.agentRequests.get(body.requestId);
		if (finished?.status === "complete") {
			record("replayed");
			return stream(request, async (push) => {
				for (const saved of finished.frames) {
					push(JSON.parse(saved.slice("data: ".length)));
				}
			});
		}

		if (!connection.features.includes("agent")) {
			record("refused");
			return remoteError(403, "ai_feature_disabled");
		}

		const violation = findTranscriptViolation(body.messages);
		if (violation) {
			record("refused", { violation });
			return remoteError(400, "cms_ai_request_invalid", violation);
		}

		const turn: ScriptTurn =
			purpose === "compact"
				? compactionTurn(body)
				: !found
					? unscriptedTurn(body.messages)
					: (found.script.turns[found.index] ?? { text: SCRIPT_END_REPLY });

		const fail = (() => {
			if (!turn.fail || !found) {
				return turn.fail;
			}
			const key = `${found.script.id}:${entry.turn}`;
			const attempts = state.attempts.get(key) ?? 0;
			if (turn.fail.times !== undefined && attempts >= turn.fail.times) {
				return undefined;
			}
			state.attempts.set(key, attempts + 1);
			return turn.fail;
		})();

		const credits = turn.credits ?? 1;
		const usage = modelUsage({
			model: model.id,
			inputChars: raw.length,
			outputChars: (turn.text ?? "").length,
			inputTokens: turn.inputTokens,
			credits,
		});
		const settle = (
			status: "complete" | "failed" | "cancelled",
			frames: string[] = [],
		) =>
			state.agentRequests.set(body.requestId, {
				connectionId: connection.id,
				status,
				frames,
				creditsCharged: status === "complete" ? credits : 0,
				usage: status === "complete" ? usage : undefined,
			});

		if (fail?.kind === "http") {
			record("failed");
			settle("failed");
			return remoteError(fail.status, fail.key ?? "ai_provider_request_failed");
		}
		if (fail?.kind === "not-stream") {
			record("failed");
			settle("failed");
			return Response.json({ data: {} });
		}
		if (!state.charge(connection, credits)) {
			record("refused");
			settle("failed");
			return remoteError(402, "organisation_ai_credit_exhausted");
		}
		//* the request is in progress from here, so a status check while a gate holds it says so
		state.agentRequests.set(body.requestId, {
			connectionId: connection.id,
			status: "processing",
			frames: [],
			creditsCharged: 0,
		});

		const calls = (turn.calls ?? []).map((call, index) => ({
			id: `call_${body.requestId.slice(0, 8)}_${index}`,
			name: call.name,
			input: call.input,
		}));
		const start = {
			type: "start",
			model: model.id,
			inputTokenLimit: model.inputTokenLimit,
			toolLimit: model.toolLimit,
		};

		const text = turn.text ?? "";
		const half = Math.ceil(text.length / 2);
		const deltas = [text.slice(0, half), text.slice(half)]
			.filter(Boolean)
			.map((part) => ({ type: "text-delta", text: part }));
		const finish = { type: "finish", requestId: body.requestId, usage };
		//* what a request sent again replays, even when this attempt's stream broke on the way
		const answerFrames = [
			start,
			...deltas,
			...calls.map((call) => ({ type: "tool-call", ...call })),
			finish,
		].map(frame);

		return stream(request, async (push) => {
			push(start);

			if (turn.gate && !(await state.waitForGate(turn.gate, request.signal))) {
				//* the CMS gave up on the request, so Lucid cancels it and charges nothing
				state.refund(connection, credits);
				record("aborted");
				settle("cancelled");
				return;
			}

			//* a failing attempt sends none of the turn's answer, except a cut stream sends its start
			if (!fail) {
				for (const delta of deltas) {
					push(delta);
				}
			}

			switch (fail?.kind) {
				case "event": {
					state.refund(connection, credits);
					push({ type: "error", message: fail.message });
					record("failed");
					settle("failed");
					return;
				}
				case "invalid": {
					push({ type: "harness-unknown" });
					record("failed", { creditsCharged: credits, calls });
					settle("complete", answerFrames);
					return;
				}
				case "mismatch": {
					push({ ...finish, requestId: crypto.randomUUID() });
					record("failed", { creditsCharged: credits, calls });
					settle("complete", answerFrames);
					return;
				}
				case "cut": {
					if (deltas[0]) {
						push(deltas[0]);
					}
					//* Lucid finished the request and charged for it, but the answer never arrived
					record("cut", { creditsCharged: credits, calls });
					settle("complete", answerFrames);
					return;
				}
			}

			for (const call of calls) {
				push({ type: "tool-call", ...call });
			}
			push(finish);
			record("answered", { creditsCharged: credits, calls });
			settle("complete", answerFrames);
		});
	};

	/** Reports a model request's status and usage, as the CMS checks when an answer went missing. */
	const status = (connection: FakeConnection, requestId: string): Response => {
		const found = state.agentRequests.get(requestId);
		if (!found || found.connectionId !== connection.id) {
			return remoteError(404, "cms_ai_request_not_found");
		}
		return Response.json({
			data: {
				requestId,
				status: found.status,
				...(found.usage ? { usage: found.usage } : {}),
			},
		});
	};

	return { answer, status };
};

export default createAgent;
