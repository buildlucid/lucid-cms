import constants from "../../../constants/constants.js";
import builtInTools from "../../../libs/agent/built-in-tools.js";
import type { Checkpoint, RunMode } from "../../../libs/agent/types.js";
import type { AgentRunStatus } from "../../../types/response.js";
import type { ServiceFn } from "../../../utils/services/types.js";
import checkAgentAccess from "./check-agent-access.js";
import executeToolStep from "./execute-tool-step.js";
import resolveCapabilities from "./resolve-capabilities.js";
import runModelTurn from "./run-model-turn.js";
import type { RunSession, SessionRun } from "./run-session.js";
import startNextTurn from "./start-next-turn.js";
import textFromParts from "./text-from-parts.js";

/** Runs model turns and tools until execution finishes, pauses or yields to the queue. */
const driveRun: ServiceFn<
	[{ run: SessionRun; checkpoint: Checkpoint; session: RunSession }],
	{ status: AgentRunStatus }
> = async (context, { run, checkpoint, session }) => {
	const { limits } = constants.agent;
	const mode: RunMode = run.routine_id ? "routine" : "chat";
	const turnLimit = mode === "routine" ? limits.routineTurns : limits.chatTurns;
	const deadline = Date.now() + constants.agent.sliceMs;

	// Access is resolved once per slice. Write tools recheck it before they run.
	const access = await checkAgentAccess(context, {
		userId: run.user_id,
		requireConnection: true,
	});
	if (access.error) {
		return session.finish(
			"failed",
			context.translate(access.error.message) ??
				context.translate("server:agent.access.unavailable"),
		);
	}
	const capabilities = resolveCapabilities(context, {
		authority: access.data,
		mode,
	});
	if (checkpoint.inFlightWrite) {
		return session.finish(
			"failed",
			context.translate("server:agent.run.write.interrupted"),
		);
	}

	while (true) {
		if (session.signal.aborted || Date.now() > deadline) {
			return session.handOff();
		}

		if (checkpoint.phase === "model") {
			if (checkpoint.turns >= turnLimit) {
				return session.finish(
					"failed",
					context.translate("server:agent.run.turn.limit", {
						data: { limit: turnLimit },
					}),
				);
			}
			if (
				checkpoint.messages.length > limits.transcriptMessages ||
				JSON.stringify(checkpoint.messages).length > limits.transcriptChars ||
				capabilities.instructions.length > limits.instructionChars
			) {
				return session.finish(
					"failed",
					context.translate("server:agent.conversation.too.large"),
				);
			}

			const turn = await runModelTurn(context, {
				run,
				checkpoint,
				session,
				capabilities,
			});
			if (turn.error) return turn;
			if (turn.data.kind === "aborted") return session.handOff();
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
					content: `Continue working on the routine. If the goal is met, call ${builtInTools.finish.name} with a summary.`,
				});
				startNextTurn(checkpoint);
				continue;
			}
		}

		while (checkpoint.cursor < checkpoint.calls.length) {
			if (session.signal.aborted) return session.handOff();

			const call = checkpoint.calls[checkpoint.cursor];

			if (!call) break;

			const step = await executeToolStep(context, {
				run,
				mode,
				call,
				checkpoint,
				session,
				capabilities,
				authority: access.data,
			});
			if (step.error) return step;
			if (step.data === "access-revoked") {
				return session.finish(
					"failed",
					context.translate("server:agent.permission.unavailable"),
				);
			}
			if (step.data === "waiting") return session.finish("waiting");
		}

		if (checkpoint.finish) return session.finish("completed");

		startNextTurn(checkpoint);
	}
};

export default driveRun;
