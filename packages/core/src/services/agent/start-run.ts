import { randomUUID } from "node:crypto";
import constants from "../../constants/constants.js";
import type { Checkpoint } from "../../libs/agent/types.js";
import { copy } from "../../libs/i18n/index.js";
import {
	AgentConversationsRepository,
	AgentMessagesRepository,
	AgentRunsRepository,
} from "../../libs/repositories/index.js";
import type { ServiceFn } from "../../utils/services/types.js";
import withTransaction from "../../utils/services/with-transaction.js";
import getOwnedConversation from "./helpers/get-owned-conversation.js";
import titleFromMessage from "./helpers/title-from-message.js";

/**
 * Records a user message and creates the queued run that answers it. The request
 * id becomes the run id, so resubmitting the same request is safe.
 */
const startRun: ServiceFn<
	[
		{
			conversationId: string;
			userId: number;
			text: string;
			requestId: string;
			routineId?: string;
			/** Extra model context that is not shown as part of the message. */
			context?: string;
		},
	],
	{ runId: string }
> = async (context, input) => {
	const conversation = await getOwnedConversation(context, {
		id: input.conversationId,
		userId: input.userId,
	});
	if (conversation.error) return conversation;

	const AgentConversations = new AgentConversationsRepository(context.db);

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
		const message = {
			id: input.requestId,
			conversationId: input.conversationId,
			runId: input.requestId,
			parts: [{ type: "text" as const, text: input.text }],
			createdAt: now,
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

			const restored = await messages.appendOnce(message);
			if (restored.error) return restored;

			return { error: undefined, data: { runId: existing.data.id } };
		}

		// A new message replaces a paused or stopped run, but never a live one.
		const activeRunId = conversation.data.active_run_id;

		if (activeRunId) {
			const replaced = await runs.transition({
				runId: activeRunId,
				from: ["waiting", "interrupted"],
				status: "cancelled",
				now,
			});
			if (replaced.error) return replaced;
			if (replaced.data) {
				const released = await conversations.releaseRun({
					conversationId: input.conversationId,
					runId: activeRunId,
					updatedAt: now,
				});
				if (released.error) return released;
			}
		}

		const claim = await conversations.claimRun({
			conversationId: input.conversationId,
			runId: input.requestId,
			updatedAt: now,
		});
		if (claim.error) return claim;
		if (!claim.data) {
			return {
				data: undefined,
				error: {
					type: "basic",
					status: 409,
					message: copy("server:agent.run.active"),
				},
			};
		}

		const history = await messages.selectLatest({
			conversationId: input.conversationId,
			limit: constants.agent.limits.historyMessages,
		});
		if (history.error) return history;
		// Earlier turns contribute their visible text; each run keeps its own tool transcript.
		const transcript: Checkpoint["messages"] = history.data
			.reverse()
			.flatMap((message) => {
				const content = message.parts
					.flatMap((part) => (part.type === "text" ? [part.text] : []))
					.join("\n");

				return content ? [{ role: message.role, content }] : [];
			});
		transcript.push({
			role: "user",
			content: input.context ? `${input.text}\n\n${input.context}` : input.text,
		});

		if (!history.data.length && !input.routineId) {
			const titled = await conversations.updateSingle({
				where: [{ key: "id", operator: "=", value: input.conversationId }],
				data: { title: titleFromMessage(input.text) },
			});
			if (titled.error) return titled;
		}

		const run = await runs.createSingle({
			data: {
				id: input.requestId,
				conversation_id: input.conversationId,
				routine_id: input.routineId ?? null,
				user_id: input.userId,
				status: "queued",
				checkpoint: {
					version: 1,
					messages: transcript,
					turns: 0,
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
			},
		});
		if (run.error) return run;

		const appended = await messages.appendOnce(message);
		if (appended.error) return appended;

		return { error: undefined, data: { runId: input.requestId } };
	});
};

export default startRun;
