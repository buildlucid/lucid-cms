import { randomUUID } from "node:crypto";
import constants from "../../../constants/constants.js";
import { summaryMessage } from "../../../libs/agent/context.js";
import { inputMessageParts } from "../../../libs/agent/input.js";
import type { StoredAgentMessagePart } from "../../../libs/agent/messages.js";
import { copy } from "../../../libs/i18n/index.js";
import {
	AgentAttributionsRepository,
	AgentCompactionsRepository,
	AgentConversationsRepository,
	AgentInputsRepository,
	AgentMessagesRepository,
	AgentRunsRepository,
} from "../../../libs/repositories/index.js";
import type {
	AgentReferenceInput,
	AgentRoutineTrigger,
	AgentScreen,
} from "../../../types/response.js";
import type {
	ServiceFn,
	ServiceResponse,
} from "../../../utils/services/types.js";
import withTransaction from "../../../utils/services/with-transaction.js";
import registerReferences from "../references/register.js";
import enqueueTitle from "./enqueue-title.js";
import getRoutineTools from "./get-routine-tools.js";
import registerUrlKeys from "./register-url-keys.js";
import routineRequestParts from "./routine-request-parts.js";
import titleFromMessage from "./title-from-message.js";

/**
 * Creates a queued run, recording its input message unless it is a retry or compaction.
 * @remarks Callers check access first; null `userId` selects the system principal.
 * Run and message IDs match, so resubmissions preserve the original message.
 */
const startRun: ServiceFn<
	[
		{
			conversationId: string;
			userId: number | null;
			/** Stable run ID reused when resubmitting the same request. */
			runId: string;
			references?: AgentReferenceInput[];
			/** Extra model context that is not shown as part of the message. */
			context?: string;
		} & (
			| {
					purpose: "compact" | "retry";
					text?: never;
					screen?: never;
					routine?: never;
			  }
			| {
					purpose?: never;
					text: string;
					/** Originating admin screen used for builder tool interactions. */
					screen?: AgentScreen;
					routine?: never;
			  }
			| {
					purpose?: never;
					text?: never;
					screen?: never;
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
		select: [
			"agent_key",
			"confirmation_mode",
			"routine_id",
			"model_selection",
			"queue_paused",
		],
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
		agent_key: agentKey,
		confirmation_mode: confirmationMode,
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
		const attributions = new AgentAttributionsRepository(context.db);
		const compactions = new AgentCompactionsRepository(context.db);
		const inputs = new AgentInputsRepository(context.db);

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
					screen: input.screen,
				}),
			};
		};

		const appendMessage = async () => {
			const parts = await messageParts();
			if (parts.error) return parts;

			const appended = await messages.appendOnce({
				id: input.runId,
				conversationId: input.conversationId,
				runId: input.runId,
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
			where: [{ key: "id", operator: "=", value: input.runId }],
		});
		if (existing.error) return existing;
		if (existing.data) {
			if (existing.data.conversation_id !== input.conversationId) {
				return {
					data: undefined,
					error: {
						type: "basic",
						status: 409,
						message: copy("server:agent.id.already.used"),
					},
				};
			}

			if (!input.purpose) {
				const restored = await appendMessage();
				if (restored.error) return restored;
			}

			return { error: undefined, data: { runId: existing.data.id } };
		}
		//* retry and compaction IDs must not consume IDs reserved by queued inputs
		if (input.purpose) {
			const taken = await inputs.selectSingle({
				select: ["id"],
				where: [{ key: "id", operator: "=", value: input.runId }],
			});
			if (taken.error) return taken;
			if (taken.data) {
				return {
					data: undefined,
					error: {
						type: "basic",
						status: 409,
						message: copy("server:agent.id.already.used"),
					},
				};
			}
		}

		const claim = await conversations.claimRun({
			conversationId: input.conversationId,
			runId: input.runId,
			updatedAt: now,
			//* paused user-input queues still allow retries, compaction and routine runs
			allowPaused: input.purpose !== undefined || input.routine !== undefined,
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

		//* Routine chat replies also inherit the routine's tool settings.
		const routineTools = await getRoutineTools(
			context,
			routineId ? [routineId] : [],
		);
		if (routineTools.error) return routineTools;

		const run = await runs.createOnce({
			id: input.runId,
			conversation_id: input.conversationId,
			routine_id: input.routine?.id ?? null,
			user_id: input.userId,
			status: "queued",
			checkpoint: {
				version: 1,
				mode: input.routine ? "routine" : "chat",
				confirmationMode,
				routineTools: routineId ? routineTools.data[routineId] : undefined,
				messages: latest.data ? [summaryMessage(latest.data.summary)] : [],
				historyAfter: latest.data?.through_position ?? 0,
				extraContext: input.context,
				screen: input.screen,
				purpose: input.purpose === "compact" ? "compact" : undefined,
				//* Leave routine model selection unresolved until run setup.
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

		const attribution = await attributions.createOnce({
			runId: input.runId,
			agentKey,
			system: input.userId === null,
			conversationId: input.conversationId,
		});
		if (attribution.error) return attribution;
		if (!run.data) {
			return {
				data: undefined,
				error: {
					type: "basic",
					status: 409,
					message: copy("server:agent.id.already.used"),
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

		return { error: undefined, data: { runId: input.runId } };
	});
};

export default startRun;
