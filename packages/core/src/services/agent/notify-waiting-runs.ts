import constants from "../../constants/constants.js";
import { checkpointSchema } from "../../libs/agent/types.js";
import logger from "../../libs/logger/index.js";
import { AgentRunsRepository } from "../../libs/repositories/index.js";
import type { ServiceFn } from "../../utils/services/types.js";
import withTransaction from "../../utils/services/with-transaction.js";
import upsertNotification from "../notifications/upsert.js";
import notificationExcerpt from "./helpers/notification-excerpt.js";
import { inputNeededNotification } from "./notifications/input-needed.js";
import { agentNotificationKeys } from "./notifications/keys.js";

/**
 * Tells people about runs that have waited on them for a while. The delay
 * leaves anyone still in the chat time to answer first. Each wait is told
 * once, and answering resolves it. A notification that fails is logged and
 * retried on the next tick.
 */
const notifyWaitingRuns: ServiceFn<[], number> = async (context) => {
	const AgentRuns = new AgentRunsRepository(context.db);

	const waiting = await AgentRuns.selectUnnotifiedWaiting({
		waitingBefore: new Date(
			Date.now() - constants.agent.inputNotifyDelayMs,
		).toISOString(),
		limit: constants.agent.batchSize,
	});
	if (waiting.error) return waiting;

	let notified = 0;

	for (const run of waiting.data) {
		const checkpoint = checkpointSchema.safeParse(run.checkpoint);
		const interaction = checkpoint.success
			? checkpoint.data.pending?.widget.interaction
			: undefined;
		const userId = run.user_id;

		try {
			const sent = await withTransaction(context, async (context) => {
				const AgentRuns = new AgentRunsRepository(context.db);

				//* marking first means overlapping ticks can't both notify, and a run with nothing to ask isn't picked again
				const marked = await AgentRuns.updateSingle({
					data: { input_notified_at: new Date().toISOString() },
					where: [
						{ key: "id", operator: "=", value: run.id },
						{ key: "status", operator: "=", value: "waiting" },
						{ key: "input_notified_at", operator: "is", value: null },
					],
					returning: ["id"],
				});
				if (marked.error) return marked;
				if (!marked.data || !interaction || userId === null) {
					return { error: undefined, data: false };
				}

				//* each question is its own fingerprint, so a later one tells them again
				const notifyRes = await upsertNotification(context, {
					definition: inputNeededNotification,
					key: agentNotificationKeys.input(run.conversation_id),
					fingerprint: interaction.id,
					recipients: [userId],
					data: {
						conversationId: run.conversation_id,
						title: run.title,
						excerpt: notificationExcerpt(interaction.title),
					},
				});
				if (notifyRes.error) return notifyRes;

				return { error: undefined, data: true };
			});
			//* a failed notification is retried next tick without holding up other runs
			if (sent.error) {
				logger.error({
					error: sent.error,
					message: "Agent input notification could not be sent",
					scope: constants.logScopes.ai,
					data: { runId: run.id },
				});
			} else if (sent.data) {
				notified++;
			}
		} catch (error) {
			logger.error({
				error,
				message: "Agent input notification could not be sent",
				scope: constants.logScopes.ai,
				data: { runId: run.id },
			});
		}
	}

	return { error: undefined, data: notified };
};

export default notifyWaitingRuns;
