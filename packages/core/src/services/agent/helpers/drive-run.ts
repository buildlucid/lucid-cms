import constants from "../../../constants/constants.js";
import { contextTokens, tokenLimit } from "../../../libs/agent/context.js";
import { textFromParts } from "../../../libs/agent/input.js";
import runnerTools from "../../../libs/agent/runner-tools.js";
import type { Checkpoint, RunMode } from "../../../libs/agent/types.js";
import type { AgentRunStatus } from "../../../types/response.js";
import type { ServiceFn } from "../../../utils/services/types.js";
import checkAgentAccess, {
	getConversationLevel,
} from "./check-agent-access.js";
import compactContext from "./compact-context.js";
import consumeSteering from "./consume-steering.js";
import executeToolStep from "./execute-tool-step.js";
import loadHistory from "./load-history.js";
import resolveModel from "./resolve-model.js";
import resolveRunSetup from "./resolve-run-setup.js";
import runModelTurn from "./run-model-turn.js";
import type { RunSession, SessionRun } from "./run-session.js";
import startNextTurn from "./start-next-turn.js";

/** Runs model turns and tools until execution finishes, pauses or yields to the queue. */
const driveRun: ServiceFn<
	[{ run: SessionRun; checkpoint: Checkpoint; session: RunSession }],
	{ status: AgentRunStatus }
> = async (context, { run, checkpoint, session }) => {
	const { limits } = constants.agent;
	const mode: RunMode = run.routine_id ? "routine" : "chat";
	const deadline = Date.now() + constants.agent.sliceMs;

	// Access is resolved once per slice. Tool execution also checks its required permissions.
	const access = await checkAgentAccess(context, {
		userId: run.user_id,
		agentKey: run.agent_key,
		level: getConversationLevel(run.conversation_user_id),
		requireConnection: true,
	});
	if (access.error) {
		return session.finish(
			"failed",
			context.translate(access.error.message) ??
				context.translate("server:agent.access.unavailable"),
		);
	}

	if (!checkpoint.selection || !checkpoint.model) {
		const model = await resolveModel(context, {
			agentKey: run.agent_key,
			routineId: run.conversation_routine_id,
			selection: checkpoint.selection,
		});
		if (model.error) {
			return session.finish(
				"interrupted",
				context.translate(model.error.message),
			);
		}

		checkpoint.selection = model.data.selection;
		checkpoint.model = {
			id: model.data.model.id,
			tokenLimit: model.data.model.inputTokenLimit,
			toolLimit: model.data.model.toolLimit,
		};
		checkpoint.measured = undefined;

		const saved = await session.save();
		if (saved.error) return saved;
	}

	//* resolved before each model turn, since trimmed context adds the history tool
	const resolve = () =>
		resolveRunSetup(context, {
			...access.data,
			mode,
			hasHistory: checkpoint.trimmed === true,
		});

	if (checkpoint.inFlightWrite) {
		return session.finish(
			"failed",
			context.translate("server:agent.run.write.interrupted"),
		);
	}

	let setup = resolve();

	runLoop: while (true) {
		if (session.signal.aborted || Date.now() > deadline) {
			return session.handOff();
		}

		if (checkpoint.phase === "model") {
			setup = resolve();

			const history = checkpoint.compaction
				? { error: undefined, data: false }
				: await loadHistory(context, { run, checkpoint, setup });
			if (history.error) return history;

			//* steering is taken before each model request and before each tool
			const steered = await consumeSteering(context, { checkpoint, session });
			if (steered.error) return steered;
			if (steered.data) continue;

			const compaction = await compactContext(context, {
				run,
				checkpoint,
				session,
				setup,
				historyFull: history.data,
			});
			if (compaction.kind === "aborted") return session.handOff();
			if (compaction.kind === "continue") continue;
			if (compaction.kind === "stop") {
				return session.finish(compaction.status, compaction.message);
			}
			if (checkpoint.historyAfter !== undefined) continue;

			if (contextTokens(checkpoint, setup) > tokenLimit(checkpoint)) {
				return session.finish(
					"failed",
					context.translate("server:agent.conversation.too.large"),
				);
			}

			//* the provider caps how many tools one request can offer
			if (
				checkpoint.model &&
				setup.definitions.length > checkpoint.model.toolLimit
			) {
				return session.finish(
					"failed",
					context.translate("server:agent.tools.too.many", {
						data: {
							count: setup.definitions.length,
							limit: checkpoint.model.toolLimit,
						},
					}),
				);
			}

			const turn = await runModelTurn(context, {
				run,
				checkpoint,
				session,
				setup,
			});
			if (turn.error) return turn;
			if (turn.data.kind === "aborted") return session.handOff();
			if (turn.data.kind === "overflow") continue;
			if (turn.data.kind === "stop") {
				return session.finish(turn.data.status, turn.data.message);
			}

			if (!checkpoint.calls.length) {
				if (mode === "chat") return session.finish("completed");
				// Routine runs keep working until they explicitly finish.
				if (checkpoint.nudges >= limits.routineNudges) {
					checkpoint.finish = {
						outcome: "needs_review",
						summary:
							textFromParts(checkpoint.parts).trim() ||
							context.translate("server:agent.run.summary.missing"),
					};

					return session.finish("completed");
				}

				checkpoint.nudges++;
				checkpoint.messages.push({
					role: "user",
					content: `Continue working on the routine. If the goal is met, call ${runnerTools.finish.name} with a summary.`,
				});
				startNextTurn(checkpoint);
				continue;
			}
		}

		while (checkpoint.cursor < checkpoint.calls.length) {
			if (session.signal.aborted) return session.handOff();

			const steered = await consumeSteering(context, { checkpoint, session });
			if (steered.error) return steered;
			if (steered.data) continue runLoop;

			const call = checkpoint.calls[checkpoint.cursor];

			if (!call) break;

			const step = await executeToolStep(context, {
				run,
				mode,
				call,
				checkpoint,
				session,
				setup,
				authority: access.data.authority,
			});
			if (step.error) return step;
			if (step.data === "waiting") return session.finish("waiting");
		}

		if (checkpoint.finish) return session.finish("completed");

		startNextTurn(checkpoint);
	}
};

export default driveRun;
