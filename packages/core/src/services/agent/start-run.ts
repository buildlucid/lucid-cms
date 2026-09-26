import { randomUUID } from "node:crypto";
import constants from "../../constants/constants.js";
import { summaryMessage } from "../../libs/agent/context.js";
import { copy } from "../../libs/i18n/index.js";
import {
	AgentCompactionsRepository,
	AgentConversationsRepository,
	AgentMessagesRepository,
	AgentRunsRepository,
} from "../../libs/repositories/index.js";
import type { ServiceFn } from "../../utils/services/types.js";
import withTransaction from "../../utils/services/with-transaction.js";
import titleFromMessage from "./helpers/title-from-message.js";

/**
 * Records a user message and creates the queued run that answers it. The request
 * id becomes the run id, so resubmitting the same request is safe. Callers check
 * access first; the run acts for `userId`, or for the system when it is null.
 */
const startRun: ServiceFn<
	[
		{
			conversationId: string;
			userId: number | null;
			requestId: string;
			routineId?: string;
			/** Extra model context that is not shown as part of the message. */
			context?: string;
		} & (
			| { purpose: "compact"; text?: never }
			| { purpose?: never; text: string }
		),
	],
	{ runId: string }
> = async (context, input) => {
	const AgentConversations = new AgentConversationsRepository(context.db);

	const conversation = await AgentConversations.selectSingle({
		select: ["context"],
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
	const current = conversation.data.context;

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
			parts: [{ type: "text" as const, text: input.text ?? "" }],
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

			if (!input.purpose) {
				const restored = await messages.appendOnce(message);
				if (restored.error) return restored;
			}

			return { error: undefined, data: { runId: existing.data.id } };
		}

		const claim = await conversations.claimRun({
			conversationId: input.conversationId,
			runId: input.requestId,
			updatedAt: now,
			allowPaused: input.purpose === "compact",
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

		const compactions = new AgentCompactionsRepository(context.db);
		const latest = await compactions.selectLatest(input.conversationId);
		if (latest.error) return latest;

		if (!input.routineId && !input.purpose) {
			const previous = await messages.selectLatest({
				conversationId: input.conversationId,
				limit: 1,
			});
			if (previous.error) return previous;
			if (!previous.data.length) {
				const titled = await conversations.updateSingle({
					where: [{ key: "id", operator: "=", value: input.conversationId }],
					data: { title: titleFromMessage(input.text) },
				});
				if (titled.error) return titled;
			}
		}

		const run = await runs.createOnce({
			id: input.requestId,
			conversation_id: input.conversationId,
			routine_id: input.routineId ?? null,
			user_id: input.userId,
			status: "queued",
			checkpoint: {
				version: 1,
				messages: latest.data ? [summaryMessage(latest.data.summary)] : [],
				//* the run loads history, including this message, after the latest summary
				historyAfter: latest.data?.through_position ?? 0,
				extraContext: input.context,
				purpose: input.purpose,
				model: current
					? { id: current.model, tokenLimit: current.tokenLimit }
					: undefined,
				trimmed: latest.data ? true : undefined,
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
			const appended = await messages.appendOnce(message);
			if (appended.error) return appended;
		}

		return { error: undefined, data: { runId: input.requestId } };
	});
};

export default startRun;
