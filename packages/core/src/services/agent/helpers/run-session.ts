import { randomUUID } from "node:crypto";
import constants from "../../../constants/constants.js";
import {
	type ContextCapabilities,
	conversationContext,
} from "../../../libs/agent/context.js";
import type {
	Checkpoint,
	ConversationContext,
} from "../../../libs/agent/types.js";
import { agentFormatter } from "../../../libs/formatters/index.js";
import { copy } from "../../../libs/i18n/index.js";
import {
	AgentCompactionsRepository,
	AgentConversationsRepository,
	AgentMessagesRepository,
	AgentRunsRepository,
} from "../../../libs/repositories/index.js";
import type {
	AgentRunStatus,
	AgentStreamEvent,
} from "../../../types/response.js";
import type {
	ServiceContext,
	ServiceResponse,
} from "../../../utils/services/types.js";
import withTransaction from "../../../utils/services/with-transaction.js";
import enqueueRun from "./enqueue-run.js";

export type SessionRun = {
	id: string;
	conversation_id: string;
	routine_id: string | null;
	user_id: number;
	execution_version: number;
};

export type RunSession = NonNullable<
	Awaited<ReturnType<typeof openRunSession>>["data"]
>;

const leaseExpiry = () =>
	new Date(Date.now() + constants.agent.leaseMs).toISOString();

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
	const token = randomUUID();

	const claim = await runs.claimExecution({
		runId: run.id,
		token,
		expectedVersion: run.execution_version,
		now: new Date().toISOString(),
		leaseExpiresAt: leaseExpiry(),
	});
	if (claim.error) return claim;
	if (!claim.data) {
		return {
			data: undefined,
			error: {
				type: "basic" as const,
				status: 409,
				message: copy("server:agent.run.superseded"),
			},
		};
	}

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
		return {
			data: undefined,
			error: {
				type: "basic" as const,
				status: 409,
				message: copy("server:agent.run.superseded"),
			},
		};
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
			emit,
			/** Persists the assistant message being written, without the rest of the checkpoint. */
			saveReply: () => saveReply(),
			/** Persists the checkpoint and the assistant message being written. */
			save: (): ServiceResponse<undefined> =>
				withTransaction(context, async (context) => {
					const saved = await write("running", undefined, context);
					if (saved.error) return saved;

					return saveReply(context);
				}),
			/** Stops execution in a final or paused state. */
			finish: async (
				status: Exclude<AgentRunStatus, "queued" | "running">,
				errorMessage?: string,
			): ServiceResponse<{ status: AgentRunStatus }> => {
				const saved = await write(status, {
					errorMessage: errorMessage ?? null,
				});
				if (saved.error) return saved;
				if (constants.agent.runStatuses.terminal.some((s) => s === status)) {
					const AgentConversations = new AgentConversationsRepository(
						context.db,
					);

					const released = await AgentConversations.releaseRun({
						conversationId: run.conversation_id,
						runId: run.id,
						updatedAt: new Date().toISOString(),
					});
					if (released.error) return released;
				}
				if (errorMessage) await emit({ type: "error", message: errorMessage });

				await emit({ type: "finish", runId: run.id, status });

				return { error: undefined, data: { status } };
			},
			/** Stores the conversation's context for its chat view and streams it. Display state only, so a failed write never stops the run. */
			saveContext: async (
				capabilities: ContextCapabilities,
				status: ConversationContext["status"],
			) => {
				const value = conversationContext(checkpoint, capabilities, status);
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
					return {
						data: undefined,
						error: {
							type: "basic" as const,
							status: 409,
							message: copy("server:agent.run.superseded"),
						},
					};
				}

				const queued = await withTransaction(context, async (context) => {
					const AgentRuns = new AgentRunsRepository(context.db);

					const updated = await AgentRuns.updateWithToken({
						runId: run.id,
						token,
						checkpoint,
						status: "queued",
						now: new Date().toISOString(),
					});
					if (updated.error) return updated;
					if (!updated.data) {
						return {
							data: undefined,
							error: {
								type: "basic" as const,
								status: 409,
								message: copy("server:agent.run.superseded"),
							},
						};
					}

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
