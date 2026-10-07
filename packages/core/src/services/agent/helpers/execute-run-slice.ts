import constants from "../../../constants/constants.js";
import { answerInteraction } from "../../../libs/agent/interactions.js";
import { isTerminalRunStatus } from "../../../libs/agent/run-status.js";
import { checkpointSchema } from "../../../libs/agent/types.js";
import { copy } from "../../../libs/i18n/index.js";
import logger from "../../../libs/logger/index.js";
import {
	AgentInputsRepository,
	AgentRunsRepository,
} from "../../../libs/repositories/index.js";
import type {
	AgentInteractionAction,
	AgentRunStatus,
	AgentStreamEvent,
} from "../../../types/response.js";
import type { ServiceFn } from "../../../utils/services/types.js";
import resolveNotification from "../../notifications/resolve.js";
import { inputNeededNotification } from "../notifications/input-needed.js";
import { agentNotificationKeys } from "../notifications/keys.js";
import continueQueue from "./continue-queue.js";
import driveRun from "./drive-run.js";
import openRunSession from "./run-session.js";
import validateInteractionResponse from "./validate-interaction-response.js";

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
			answer?: {
				interactionId: string;
				response: Record<string, unknown>;
				action: AgentInteractionAction;
				userId: number;
			};
		},
	],
	{ status: AgentRunStatus }
> = async (context, input) => {
	const emit = input.emit ?? (async () => {});
	const AgentRuns = new AgentRunsRepository(context.db);

	const selected = await AgentRuns.selectForExecution(input.runId);
	if (selected.error) return selected;

	const run = selected.data;

	if (!run) {
		return {
			data: undefined,
			error: {
				type: "basic",
				status: 404,
				message: copy("server:agent.run.not.found"),
			},
		};
	}

	if (isTerminalRunStatus(run.status)) {
		await emit({ type: "finish", runId: run.id, status: run.status });

		return { error: undefined, data: { status: run.status } };
	}

	const parsed = checkpointSchema.safeParse(run.checkpoint);

	if (!parsed.success) {
		return {
			data: undefined,
			error: {
				type: "basic",
				status: 409,
				message: copy("server:agent.run.cannot.continue"),
			},
		};
	}

	const checkpoint = parsed.data;

	//* a steer replaces the answer a waiting run needs, and dismisses its question
	const Inputs = new AgentInputsRepository(context.db);
	const pendingInputs = await Inputs.selectDeliverable(run.conversation_id);
	if (pendingInputs.error) return pendingInputs;

	const steering = pendingInputs.data.some(
		(item) => item.target_run_id === run.id,
	);
	const { pending } = checkpoint;
	if (pending && !pending.answer && !steering) {
		if (input.answer?.interactionId !== pending.widget.interaction.id) {
			return {
				data: undefined,
				error: {
					type: "basic",
					status: 409,
					message: copy("server:agent.run.answer.required"),
				},
			};
		}

		const answer = await validateInteractionResponse(context, {
			run,
			checkpoint,
			pending,
			response: input.answer.response,
			action: input.answer.action,
			userId: input.answer.userId,
		});
		if (answer.error) return answer;

		answerInteraction(checkpoint, answer.data, input.answer.userId);
	} else if (input.answer) {
		return {
			data: undefined,
			error: {
				type: "basic",
				status: 409,
				message: copy("server:agent.run.answer.unexpected"),
			},
		};
	}

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
		if (input.answer && checkpoint.pending) {
			const saved = await session.data.save();
			if (saved.error) return saved;

			await emit({
				messageId: checkpoint.messageId,
				...checkpoint.pending.widget,
			});
		}

		return await driveRun(context, { run, checkpoint, session: session.data });
	} catch {
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
