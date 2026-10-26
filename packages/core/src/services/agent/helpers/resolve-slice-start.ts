import { answerInteraction } from "../../../libs/agent/interactions.js";
import { isTerminalRunStatus } from "../../../libs/agent/run-status.js";
import {
	type AgentRunAnswer,
	type Checkpoint,
	checkpointSchema,
} from "../../../libs/agent/types.js";
import { copy } from "../../../libs/i18n/index.js";
import {
	AgentInputsRepository,
	AgentRunsRepository,
} from "../../../libs/repositories/index.js";
import type { ServiceFn } from "../../../utils/services/types.js";
import validateInteractionResponse from "./validate-interaction-response.js";

type SliceRun = NonNullable<
	Extract<
		Awaited<ReturnType<AgentRunsRepository["selectForExecution"]>>,
		{ error: undefined }
	>["data"]
>;

/** Loads the next run slice, validates and applies required answers, accepts saved-answer retries, lets steers replace unanswered questions and rejects missing or unexpected answers before host handoff. */
const resolveSliceStart: ServiceFn<
	[{ runId: string; answer?: AgentRunAnswer }],
	| { run: SliceRun; finished: true }
	| { run: SliceRun; finished: false; checkpoint: Checkpoint; applied: boolean }
> = async (context, input) => {
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
		return { error: undefined, data: { run, finished: true } };
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
	const { pending, answered } = checkpoint;
	//* a retry can resubmit the answer the run already saved, even once its tool has run, so it carries on without it
	const submitted =
		input.answer &&
		answered?.interactionId === input.answer.interactionId &&
		answered.userId === input.answer.userId &&
		answered.action === input.answer.action
			? undefined
			: input.answer;

	if (pending && !pending.answer && !steering) {
		if (submitted?.interactionId !== pending.widget.interaction.id) {
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
			response: submitted.response,
			action: submitted.action,
			userId: submitted.userId,
		});
		if (answer.error) return answer;

		answerInteraction(checkpoint, answer.data, submitted.userId);

		return {
			error: undefined,
			data: { run, finished: false, checkpoint, applied: true },
		};
	}

	if (submitted) {
		return {
			data: undefined,
			error: {
				type: "basic",
				status: 409,
				message: copy("server:agent.run.answer.unexpected"),
			},
		};
	}

	return {
		error: undefined,
		data: { run, finished: false, checkpoint, applied: false },
	};
};

export default resolveSliceStart;
