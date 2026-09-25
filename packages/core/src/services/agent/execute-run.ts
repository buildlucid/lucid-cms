import constants from "../../constants/constants.js";
import { checkpointSchema } from "../../libs/agent/types.js";
import { copy } from "../../libs/i18n/index.js";
import { AgentRunsRepository } from "../../libs/repositories/index.js";
import { agentApprovalAnswerSchema } from "../../schemas/agent.js";
import type { AgentRunStatus, AgentStreamEvent } from "../../types/response.js";
import type { ServiceFn } from "../../utils/services/types.js";
import driveRun from "./helpers/drive-run.js";
import openRunSession from "./helpers/run-session.js";

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
			answer?: { questionId: string; answer: string };
		},
	],
	{ status: AgentRunStatus }
> = async (context, input) => {
	const emit = input.emit ?? (async () => {});
	const AgentRuns = new AgentRunsRepository(context.db);

	const selected = await AgentRuns.selectSingle({
		select: [
			"id",
			"conversation_id",
			"routine_id",
			"user_id",
			"status",
			"checkpoint",
			"execution_version",
		],
		where: [{ key: "id", operator: "=", value: input.runId }],
	});
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

	if (constants.agent.runStatuses.terminal.some((s) => s === run.status)) {
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

	if (checkpoint.pending) {
		if (input.answer?.questionId !== checkpoint.pending.id) {
			return {
				data: undefined,
				error: {
					type: "basic",
					status: 409,
					message: copy("server:agent.run.answer.required"),
				},
			};
		}

		if (
			checkpoint.pending.kind === "approval" &&
			!agentApprovalAnswerSchema.safeParse(input.answer.answer).success
		) {
			return {
				data: undefined,
				error: {
					type: "basic",
					status: 400,
					message: copy("server:agent.run.approval.invalid"),
				},
			};
		}

		checkpoint.pending.answer = input.answer.answer;
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
		return await driveRun(context, { run, checkpoint, session: session.data });
	} catch {
		await session.data.save();

		return await session.data.finish(
			"interrupted",
			context.translate("server:agent.run.execution.interrupted"),
		);
	} finally {
		session.data.close();
	}
};

export default executeRun;
