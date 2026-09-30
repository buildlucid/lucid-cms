import { randomUUID } from "node:crypto";
import constants from "../../constants/constants.js";
import { summaryMessage } from "../../libs/agent/context.js";
import { inputMessageParts } from "../../libs/agent/input.js";
import { copy } from "../../libs/i18n/index.js";
import {
	AgentCompactionsRepository,
	AgentConversationsRepository,
	AgentMessagesRepository,
	AgentRunsRepository,
} from "../../libs/repositories/index.js";
import type { StoredAgentMessagePart } from "../../schemas/agent.js";
import type {
	AgentReferenceInput,
	AgentRoutineTrigger,
} from "../../types/response.js";
import type { ServiceFn, ServiceResponse } from "../../utils/services/types.js";
import withTransaction from "../../utils/services/with-transaction.js";
import enqueueTitle from "./helpers/enqueue-title.js";
import getRoutineTools from "./helpers/get-routine-tools.js";
import registerUrlKeys from "./helpers/register-url-keys.js";
import routineRequestParts from "./helpers/routine-request-parts.js";
import titleFromMessage from "./helpers/title-from-message.js";
import registerReferences from "./references/register.js";

/**
 * Records a user message and creates the queued run that answers it. The request
 * id becomes the run id, so resubmitting the same request is safe. Callers check
 * access first; the run acts for `userId`, or for the system when it is null.
 * Compaction and retries start a run without a new message.
 */
const startRun: ServiceFn<
	[
		{
			conversationId: string;
			userId: number | null;
			requestId: string;
			references?: AgentReferenceInput[];
			/** Extra model context that is not shown as part of the message. */
			context?: string;
		} & (
			| { purpose: "compact" | "retry"; text?: never; routine?: never }
			| { purpose?: never; text: string; routine?: never }
			| {
					purpose?: never;
					text?: never;
					routine: {
						id: string;
						name: string;
						instructions: string;
						trigger: AgentRoutineTrigger;
					};
			  }
		),
	],
	{ runId: string }
> = async (context, input) => {
	const AgentConversations = new AgentConversationsRepository(context.db);

	const conversation = await AgentConversations.selectSingle({
		select: ["approval_mode", "routine_id", "model_selection", "queue_paused"],
		where: [{ key: "id", operator: "=", value: input.conversationId }],
	});
	if (conversation.error) return conversation;
	if (!conversation.data) {
		return {
			data: undefined,
			error: {
				type: "basic",
				status: 404,
				message: copy("server:agent.conversation.not.found"),
			},
		};
	}
	const {
		approval_mode: approvalMode,
		routine_id: routineId,
		model_selection: modelSelection,
		queue_paused: queuePaused,
	} = conversation.data;

	const repaired = await AgentConversations.releaseFinishedClaims({
		conversationId: input.conversationId,
		now: new Date().toISOString(),
		staleBefore: new Date(Date.now() - constants.agent.leaseMs).toISOString(),
	});
	if (repaired.error) return repaired;

	return withTransaction(context, async (context) => {
		const now = new Date().toISOString();
		const conversations = new AgentConversationsRepository(context.db);
		const messages = new AgentMessagesRepository(context.db);
		const runs = new AgentRunsRepository(context.db);
		const compactions = new AgentCompactionsRepository(context.db);

		const latest = await compactions.selectLatest(input.conversationId);
		if (latest.error) return latest;

		//* attachments are linked first, so the message saves the details the agent sees
		const messageParts = async (): ServiceResponse<
			StoredAgentMessagePart[]
		> => {
			if (input.routine) {
				return routineRequestParts(context, {
					conversationId: input.conversationId,
					after: latest.data?.through_position ?? 0,
					routine: input.routine,
				});
			}

			const references = await registerReferences(context, {
				conversationId: input.conversationId,
				references: input.references ?? [],
				source: { type: "message" },
				skipMissing: true,
			});
			if (references.error) return references;

			return {
				error: undefined,
				data: inputMessageParts({
					text: input.text ?? "",
					references: references.data,
				}),
			};
		};

		const appendMessage = async () => {
			const parts = await messageParts();
			if (parts.error) return parts;

			const appended = await messages.appendOnce({
				id: input.requestId,
				conversationId: input.conversationId,
				runId: input.requestId,
				parts: parts.data,
				createdAt: now,
			});
			if (appended.error) return appended;

			//* a retry keeps the first message, so its changed text cannot add URLs
			if (!appended.data) return { error: undefined, data: undefined };

			return registerUrlKeys(context, {
				conversationId: input.conversationId,
				role: "user",
				parts: parts.data,
			});
		};

		const existing = await runs.selectSingle({
			select: ["id", "conversation_id"],
			where: [{ key: "id", operator: "=", value: input.requestId }],
		});
		if (existing.error) return existing;
		if (existing.data) {
			if (existing.data.conversation_id !== input.conversationId) {
				return {
					data: undefined,
					error: {
						type: "basic",
						status: 409,
						message: copy("server:agent.request.already.used"),
					},
				};
			}

			if (!input.purpose) {
				const restored = await appendMessage();
				if (restored.error) return restored;
			}

			return { error: undefined, data: { runId: existing.data.id } };
		}

		const claim = await conversations.claimRun({
			conversationId: input.conversationId,
			runId: input.requestId,
			updatedAt: now,
			//* a failed run pauses the queue, and retrying is how a person picks it back up
			allowPaused: input.purpose !== undefined,
		});
		if (claim.error) return claim;
		if (!claim.data) {
			return {
				data: undefined,
				error: {
					type: "basic",
					status: 409,
					message: copy(
						queuePaused
							? "server:agent.conversation.queue.paused"
							: "server:agent.run.active",
					),
				},
			};
		}

		let firstMessage = false;
		if (!input.routine && !input.purpose) {
			const previous = await messages.selectLatest({
				conversationId: input.conversationId,
				limit: 1,
			});
			if (previous.error) return previous;
			if (!previous.data.length) {
				firstMessage = true;
			}
		}

		//* every run in a routine chat, including replies from people, uses the routine's tool settings
		const routineTools = await getRoutineTools(
			context,
			routineId ? [routineId] : [],
		);
		if (routineTools.error) return routineTools;

		const run = await runs.createOnce({
			id: input.requestId,
			conversation_id: input.conversationId,
			routine_id: input.routine?.id ?? null,
			user_id: input.userId,
			status: "queued",
			checkpoint: {
				version: 1,
				approvalMode,
				routineTools: routineId ? routineTools.data[routineId] : undefined,
				messages: latest.data ? [summaryMessage(latest.data.summary)] : [],
				//* the run loads history, including this message, after the latest summary
				historyAfter: latest.data?.through_position ?? 0,
				extraContext: input.context,
				purpose: input.purpose === "compact" ? "compact" : undefined,
				//* routine runs leave the chat's choice to resolve to the routine's model
				selection: input.routine ? undefined : (modelSelection ?? undefined),
				trimmed: latest.data ? true : undefined,
				nudges: 0,
				requestId: randomUUID(),
				messageId: randomUUID(),
				parts: [],
				calls: [],
				cursor: 0,
				phase: "model",
			},
			created_at: now,
			updated_at: now,
		});
		if (run.error) return run;
		if (!run.data) {
			return {
				data: undefined,
				error: {
					type: "basic",
					status: 409,
					message: copy("server:agent.request.already.used"),
				},
			};
		}

		if (!input.purpose) {
			const appended = await appendMessage();
			if (appended.error) return appended;
		}
		if (firstMessage) {
			const titled = await conversations.updateProvisionalTitle({
				conversationId: input.conversationId,
				title: titleFromMessage(input.text ?? ""),
			});
			if (titled.error) return titled;

			await enqueueTitle(context, {
				conversationId: input.conversationId,
				userId: input.userId,
				scope: "first-message",
			});
		}

		return { error: undefined, data: { runId: input.requestId } };
	});
};

export default startRun;
