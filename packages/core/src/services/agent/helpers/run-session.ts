import { randomUUID } from "node:crypto";
import constants from "../../../constants/constants.js";
import {
	type ContextSetup,
	conversationContext,
} from "../../../libs/agent/context.js";
import { inputMessageParts } from "../../../libs/agent/input.js";
import { isTerminalRunStatus } from "../../../libs/agent/run-status.js";
import type {
	Checkpoint,
	ConversationContext,
} from "../../../libs/agent/types.js";
import { agentFormatter } from "../../../libs/formatters/index.js";
import { copy } from "../../../libs/i18n/index.js";
import {
	AgentCompactionsRepository,
	AgentConversationsRepository,
	AgentInputsRepository,
	AgentMessagesRepository,
	AgentRunsRepository,
} from "../../../libs/repositories/index.js";
import type { StoredAgentMessagePart } from "../../../schemas/agent.js";
import type {
	AgentReferenceInput,
	AgentRunStatus,
	AgentStreamEvent,
} from "../../../types/response.js";
import type {
	ServiceContext,
	ServiceResponse,
} from "../../../utils/services/types.js";
import withTransaction from "../../../utils/services/with-transaction.js";
import registerReferences from "../references/register.js";
import enqueueRun from "./enqueue-run.js";
import enqueueTitle from "./enqueue-title.js";
import registerUrlKeys from "./register-url-keys.js";

export type SessionRun = {
	id: string;
	conversation_id: string;
	routine_id: string | null;
	/** Who the run acts for. Null when it acts as the system. */
	user_id: number | null;
	execution_version: number;
	agent_key: string;
	conversation_user_id: number | null;
	conversation_routine_id: string | null;
};

export type RunSession = NonNullable<
	Awaited<ReturnType<typeof openRunSession>>["data"]
>;

const leaseExpiry = () =>
	new Date(Date.now() + constants.agent.leaseMs).toISOString();

//* another worker, or a cancellation, took the run
const supersededError = () =>
	({
		type: "basic",
		status: 409,
		message: copy("server:agent.run.superseded"),
	}) as const;

/**
 * Claims a run for this worker and owns it until it stops. Every write is fenced
 * by the execution token, so a stale or cancelled worker cannot overwrite newer state.
 */
const openRunSession = async (
	context: ServiceContext,
	props: {
		run: SessionRun;
		checkpoint: Checkpoint;
		signal?: AbortSignal;
		emit: (event: AgentStreamEvent) => Promise<void>;
	},
) => {
	const { run, checkpoint } = props;
	const runs = new AgentRunsRepository(context.db);
	const Inputs = new AgentInputsRepository(context.db);
	const token = randomUUID();
	const executionVersion = run.execution_version + 1;
	let replyRevision = 0;
	//* tool outputs are the only assistant URL source, so keys only change when a call settles
	const registeredCalls = new Set<string>();

	const claim = await runs.claimExecution({
		runId: run.id,
		token,
		expectedVersion: run.execution_version,
		now: new Date().toISOString(),
		leaseExpiresAt: leaseExpiry(),
	});
	if (claim.error) return claim;
	if (!claim.data) return { data: undefined, error: supersededError() };

	const lease = new AbortController();
	const signal = AbortSignal.any(
		props.signal ? [lease.signal, props.signal] : [lease.signal],
	);
	const loseLease = () => lease.abort();

	let beating = false;
	const heartbeat = setInterval(async () => {
		if (beating) return;

		beating = true;

		try {
			const renewed = await runs.heartbeatExecution({
				runId: run.id,
				token,
				now: new Date().toISOString(),
				leaseExpiresAt: leaseExpiry(),
			});
			if (renewed.error || !renewed.data) loseLease();
		} catch {
			loseLease();
		} finally {
			beating = false;
		}
	}, constants.agent.heartbeatMs);

	const superseded = () => {
		loseLease();
		return { data: undefined, error: supersededError() };
	};

	const write = async (
		status: AgentRunStatus,
		props?: { errorMessage?: string | null },
		writeContext = context,
	): ServiceResponse<undefined> => {
		const AgentRuns = new AgentRunsRepository(writeContext.db);
		const updated = await AgentRuns.updateWithToken({
			runId: run.id,
			token,
			checkpoint,
			status,
			errorMessage: props?.errorMessage,
			finish: status === "completed" ? checkpoint.finish : undefined,
			now: new Date().toISOString(),
		});
		if (updated.error) return updated;
		if (!updated.data) return superseded();

		return { error: undefined, data: undefined };
	};

	const saveReply = async (
		writeContext = context,
	): ServiceResponse<undefined> => {
		if (!checkpoint.parts.length) return { error: undefined, data: undefined };

		const AgentMessages = new AgentMessagesRepository(writeContext.db);
		const message = await AgentMessages.upsertForRun({
			id: checkpoint.messageId,
			conversationId: run.conversation_id,
			runId: run.id,
			token,
			parts: checkpoint.parts,
			executionVersion,
			revision: ++replyRevision,
			now: new Date().toISOString(),
		});
		if (message.error) return message;
		if (!message.data) return superseded();

		return { error: undefined, data: undefined };
	};

	const emit = async (event: AgentStreamEvent) => {
		if (!signal.aborted) await props.emit(event);
	};

	return {
		error: undefined,
		data: {
			signal,
			claimSteering: () => Inputs.claimSteering(run.id, token),
			/** Saves steered input as a user message, returning its parts with attachment details. */
			appendInput: async (input: {
				id: string;
				text: string;
				references: AgentReferenceInput[];
				createdAt: string;
			}) =>
				withTransaction<StoredAgentMessagePart[]>(context, async (context) => {
					const references = await registerReferences(context, {
						conversationId: run.conversation_id,
						references: input.references,
						source: { type: "message" },
						skipMissing: true,
					});
					if (references.error) return references;

					const parts = inputMessageParts({
						text: input.text,
						references: references.data,
					});

					const AgentMessages = new AgentMessagesRepository(context.db);

					const stored = await AgentMessages.upsertForRun({
						id: input.id,
						conversationId: run.conversation_id,
						runId: run.id,
						token,
						role: "user",
						parts,
						executionVersion,
						revision: ++replyRevision,
						now: input.createdAt,
					});
					if (stored.error) return stored;
					if (!stored.data) return superseded();

					const registered = await registerUrlKeys(context, {
						conversationId: run.conversation_id,
						role: "user",
						parts,
					});
					if (registered.error) return registered;

					return { error: undefined, data: parts };
				}),
			emit,
			/** Persists the assistant message being written, without the rest of the checkpoint. */
			saveReply: () => saveReply(),
			/** Persists the checkpoint and the assistant message being written, with the URLs its settled tools returned. */
			save: async (): ServiceResponse<undefined> => {
				const settled = checkpoint.parts.flatMap((part) =>
					part.type === "tool" &&
					part.status !== "pending" &&
					part.status !== "running" &&
					!registeredCalls.has(part.id)
						? [part]
						: [],
				);

				const saved = await withTransaction(context, async (context) => {
					const written = await write("running", undefined, context);
					if (written.error) return written;

					const reply = await saveReply(context);
					if (reply.error) return reply;

					return registerUrlKeys(context, {
						conversationId: run.conversation_id,
						role: "assistant",
						parts: settled,
					});
				});
				if (saved.error) return saved;

				for (const part of settled) registeredCalls.add(part.id);

				return saved;
			},
			/** Stops execution in a final or paused state. */
			finish: async (
				status: Exclude<AgentRunStatus, "queued" | "running">,
				errorMessage?: string,
			): ServiceResponse<{ status: AgentRunStatus }> => {
				if (status === "failed" || status === "cancelled") {
					const AgentConversations = new AgentConversationsRepository(
						context.db,
					);
					const paused = await AgentConversations.pauseQueue({
						conversationId: run.conversation_id,
						runId: run.id,
						token,
					});
					if (paused.error) return paused;
					if (!paused.data) return superseded();
				}

				const finishRun = async (writeContext = context) => {
					const saved = await write(
						status,
						{
							errorMessage: errorMessage ?? null,
						},
						writeContext,
					);
					if (saved.error) return saved;

					if (isTerminalRunStatus(status)) {
						const conversations = new AgentConversationsRepository(
							writeContext.db,
						);
						const released = await conversations.releaseRun({
							conversationId: run.conversation_id,
							runId: run.id,
							updatedAt: new Date().toISOString(),
						});
						if (released.error) return released;
					}

					if (status === "completed" && run.conversation_routine_id) {
						await enqueueTitle(writeContext, {
							conversationId: run.conversation_id,
							userId: run.conversation_user_id,
							scope: "conversation",
							runId: run.id,
						});
					}

					return { error: undefined, data: undefined };
				};

				const finished =
					status === "completed" && run.conversation_routine_id
						? await withTransaction(context, finishRun)
						: await finishRun();
				if (finished.error) return finished;

				if (errorMessage) await emit({ type: "error", message: errorMessage });

				await emit({ type: "finish", runId: run.id, status });

				return { error: undefined, data: { status } };
			},
			/** Stores the conversation's context for its chat view and streams it. Display state only, so a failed write never stops the run. */
			saveContext: async (
				setup: ContextSetup,
				status: ConversationContext["status"],
			) => {
				const value = conversationContext(checkpoint, setup, status);
				if (!value) return;

				const AgentConversations = new AgentConversationsRepository(context.db);
				await AgentConversations.updateContext({
					conversationId: run.conversation_id,
					runId: run.id,
					context: value,
				});

				const formatted = agentFormatter.formatContext({
					context: value,
					active: true,
				});
				if (formatted) {
					await emit({ type: "context", runId: run.id, context: formatted });
				}
			},
			/** Save the result before the checkpoint so either write can be retried without losing context. */
			storeCompaction: async (record: {
				id: string;
				summary: string;
				throughPosition: number;
			}): ServiceResponse<undefined> => {
				const compactions = new AgentCompactionsRepository(context.db);
				const stored = await compactions.storeForRun({
					...record,
					conversationId: run.conversation_id,
					runId: run.id,
					token,
				});
				if (stored.error) return stored;
				if (!stored.data) return superseded();

				return write("running");
			},
			/** Returns the run to the queue so a background worker continues it. */
			handOff: async (): ServiceResponse<{ status: AgentRunStatus }> => {
				if (lease.signal.aborted) {
					return { data: undefined, error: supersededError() };
				}

				const queued = await withTransaction(context, async (context) => {
					const updated = await write("queued", undefined, context);
					if (updated.error) return updated;

					return enqueueRun(context, { runId: run.id, userId: run.user_id });
				});
				if (queued.error) return queued;

				return { error: undefined, data: { status: "queued" } };
			},
			close: () => {
				clearInterval(heartbeat);
				lease.abort();
			},
		},
	};
};

export default openRunSession;
