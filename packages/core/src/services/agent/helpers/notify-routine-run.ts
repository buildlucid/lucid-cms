import constants from "../../../constants/constants.js";
import logger from "../../../libs/logger/index.js";
import { getAgentPermission } from "../../../libs/permission/agent-permissions.js";
import {
	AgentRoutinesRepository,
	UsersRepository,
} from "../../../libs/repositories/index.js";
import type { AgentRunOutcome } from "../../../types/response.js";
import type { ServiceFn } from "../../../utils/services/types.js";
import withTransaction from "../../../utils/services/with-transaction.js";
import resolveNotification from "../../notifications/resolve.js";
import sendNotification from "../../notifications/send.js";
import upsertNotification from "../../notifications/upsert.js";
import { agentNotificationKeys } from "../notifications/keys.js";
import { routineFailedNotification } from "../notifications/routine-failed.js";
import { routineNeedsReviewNotification } from "../notifications/routine-needs-review.js";
import { routineReportNotification } from "../notifications/routine-report.js";
import notificationExcerpt from "./notification-excerpt.js";

/**
 * Tells the people who look after a routine how its run ended: the owner of
 * a user routine, or everyone who manages the agent's code routines. A
 * failure stays open until a later run completes. Call in the transaction
 * that finishes the run. Notifications that can't be written are logged and
 * rolled back on their own, so they never stop the run finishing.
 */
const notifyRoutineRun: ServiceFn<
	[
		{
			runId: string;
			routineId: string;
			conversationId: string;
			result:
				| { status: "failed"; message: string }
				| { status: "completed"; outcome: AgentRunOutcome; summary: string };
		},
	],
	undefined
> = async (context, data) => {
	try {
		const notified = await withTransaction(
			context,
			async (context) => {
				const Routines = new AgentRoutinesRepository(context.db);
				const Users = new UsersRepository(context.db);
				const { result } = data;
				const failedKey = agentNotificationKeys.routineFailed(data.routineId);

				if (result.status === "completed") {
					const resolveRes = await resolveNotification(context, {
						definition: routineFailedNotification,
						key: failedKey,
					});
					if (resolveRes.error) return resolveRes;
					if (result.outcome === "nothing_to_report") {
						return { error: undefined, data: undefined };
					}
				}

				const routineRes = await Routines.selectSingle({
					select: ["name", "source", "user_id", "agent_key"],
					where: [{ key: "id", operator: "=", value: data.routineId }],
				});
				if (routineRes.error) return routineRes;

				const routine = routineRes.data;
				if (!routine) return { error: undefined, data: undefined };

				const recipientsRes =
					routine.source === "code"
						? await Users.selectIdsWithPermission({
								permission: getAgentPermission(
									routine.agent_key,
									"manage-code-routines",
								),
							})
						: {
								error: undefined,
								data: routine.user_id === null ? [] : [routine.user_id],
							};
				if (recipientsRes.error) return recipientsRes;

				const notificationData = {
					routineId: data.routineId,
					conversationId: data.conversationId,
					name: routine.name,
					excerpt: notificationExcerpt(
						result.status === "failed" ? result.message : result.summary,
					),
				};

				if (result.status === "failed") {
					//* a repeat failure points the open one at the latest run without telling people again
					const notifyRes = await upsertNotification(context, {
						definition: routineFailedNotification,
						key: failedKey,
						recipients: recipientsRes.data,
						data: notificationData,
					});
					if (notifyRes.error) return notifyRes;
				} else if (result.outcome === "needs_review") {
					const notifyRes = await upsertNotification(context, {
						definition: routineNeedsReviewNotification,
						key: agentNotificationKeys.review(data.conversationId),
						fingerprint: data.runId,
						recipients: recipientsRes.data,
						data: notificationData,
					});
					if (notifyRes.error) return notifyRes;
				} else {
					const notifyRes = await sendNotification(context, {
						definition: routineReportNotification,
						recipients: recipientsRes.data,
						data: notificationData,
					});
					if (notifyRes.error) return notifyRes;
				}

				return { error: undefined, data: undefined };
			},
			{ isolate: true },
		);
		if (notified.error) {
			logger.error({
				error: notified.error,
				message: "Agent routine notification could not be sent",
				scope: constants.logScopes.ai,
				data: { runId: data.runId, routineId: data.routineId },
			});
		}
	} catch (error) {
		logger.error({
			error,
			message: "Agent routine notification could not be sent",
			scope: constants.logScopes.ai,
			data: { runId: data.runId, routineId: data.routineId },
		});
	}

	return { error: undefined, data: undefined };
};

export default notifyRoutineRun;
