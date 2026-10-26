import type { AgentStreamEvent } from "@lucidcms/types";
import constants from "../../../constants/constants.js";
import type { AgentRunAnswer } from "../../../libs/agent/types.js";
import logger from "../../../libs/logger/index.js";
import type { AgentRunStatus } from "../../../types/response.js";
import type { ServiceFn } from "../../../utils/services/types.js";
import resolveNotification from "../../notifications/resolve.js";
import { inputNeededNotification } from "../notifications/input-needed.js";
import { agentNotificationKeys } from "../notifications/keys.js";
import continueQueue from "./continue-queue.js";
import driveRun from "./drive-run.js";
import resolveSliceStart from "./resolve-slice-start.js";
import openRunSession from "./run-session.js";

/**
 * Drives a run for one slice: until it finishes, pauses for a person, or runs out
 * of time. Unfinished work is handed back to the queue, so a routine can loop for
 * longer than any single request or job allows.
 */
const executeRunSlice: ServiceFn<
	[
		{
			runId: string;
			signal?: AbortSignal;
			emit?: (event: AgentStreamEvent) => Promise<void>;
			answer?: AgentRunAnswer;
		},
	],
	{ status: AgentRunStatus }
> = async (context, input) => {
	const emit = input.emit ?? (async () => {});

	const start = await resolveSliceStart(context, input);
	if (start.error) return start;

	if (start.data.finished) {
		const { run } = start.data;
		await emit({ type: "finish", runId: run.id, status: run.status });

		return { error: undefined, data: { status: run.status } };
	}

	const { run, checkpoint, applied } = start.data;

	const session = await openRunSession(context, {
		run,
		checkpoint,
		signal: input.signal,
		emit,
	});
	if (session.error) return session;

	try {
		//* resolved once claimed, so a tick can't reopen it while the run still looks like it's waiting
		if (run.status === "waiting") {
			const resolved = await resolveNotification(context, {
				definition: inputNeededNotification,
				key: agentNotificationKeys.input(run.conversation_id),
			});
			if (resolved.error) {
				logger.error({
					error: resolved.error,
					message: "Agent input notification could not be resolved",
					scope: constants.logScopes.ai,
					data: { runId: run.id },
				});
			}
		}

		//* the answer is saved and shown before the tool runs, so a retry never asks again
		if (applied && checkpoint.pending) {
			const saved = await session.data.save();
			if (saved.error) return saved;

			await emit({
				messageId: checkpoint.messageId,
				...checkpoint.pending.widget,
			});
		}

		return await driveRun(context, { run, checkpoint, session: session.data });
	} catch (error) {
		logger.error({
			error,
			message: "Agent run was interrupted by an unexpected error",
			scope: constants.logScopes.ai,
			data: { runId: run.id },
		});
		await session.data.save();

		return await session.data.finish(
			"interrupted",
			context.translate("server:agent.run.execution.interrupted"),
		);
	} finally {
		session.data.close();
		//* Include the next run in replay so a returning chat follows the queue.
		await continueQueue(context, {
			conversationId: run.conversation_id,
			emit: input.emit,
		});
	}
};

export default executeRunSlice;
