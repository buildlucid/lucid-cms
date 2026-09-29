import constants from "../../constants/constants.js";
import { answerInteraction } from "../../libs/agent/interactions.js";
import { isTerminalRunStatus } from "../../libs/agent/run-status.js";
import { checkpointSchema } from "../../libs/agent/types.js";
import { copy } from "../../libs/i18n/index.js";
import logger from "../../libs/logger/index.js";
import {
	AgentInputsRepository,
	AgentRunsRepository,
} from "../../libs/repositories/index.js";
import type {
	AgentInteractionAction,
	AgentRunStatus,
	AgentStreamEvent,
} from "../../types/response.js";
import type { ServiceContext, ServiceFn } from "../../utils/services/types.js";
import advanceInputs from "./advance-inputs.js";
import getInputsEvent from "./get-inputs-event.js";
import driveRun from "./helpers/drive-run.js";
import openRunSession from "./helpers/run-session.js";
import validateInteractionResponse from "./helpers/validate-interaction-response.js";

/**
 * Starts the next queued message once a run lets go of the conversation, and
 * tells an open chat so it follows the new run straight away.
 */
const continueQueue = async (
	context: ServiceContext,
	props: {
		conversationId: string;
		emit?: (event: AgentStreamEvent) => Promise<void>;
	},
) => {
	const advanced = await advanceInputs(context, {
		conversationId: props.conversationId,
	});
	if (advanced.error) {
		logger.error({
			message: `Agent input for conversation ${props.conversationId} could not advance: ${context.translate(advanced.error.message)}`,
			scope: constants.logScopes.ai,
		});
		return;
	}
	if (!props.emit) return;

	if (advanced.data.runId) {
		await props.emit({ type: "next", runId: advanced.data.runId });
	}
	const queue = await getInputsEvent(context, {
		conversationId: props.conversationId,
	});
	if (queue.data) await props.emit(queue.data);
};

/**
 * Drives a run for one slice: until it finishes, pauses for a person, or runs out
 * of time. Unfinished work is handed back to the queue, so a routine can loop for
 * longer than any single request or job allows.
 */
const executeRun: ServiceFn<
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
		//* only a watching chat needs telling; background workers skip the extra reads
		await continueQueue(context, {
			conversationId: run.conversation_id,
			emit: input.emit,
		});
	}
};

export default executeRun;
