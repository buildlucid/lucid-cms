import type runnerTools from "../../../../libs/agent/runner-tools.js";
import { toolFailure, toolResult } from "../tool-outcome.js";
import type { RunnerToolInputHandler } from "./types.js";

/** Returns an available skill's instructions. */
const skill: RunnerToolInputHandler<typeof runnerTools.skill> = async (
	context,
	{ input, setup },
) => {
	const found = setup.skills.find((skill) => skill.name === input.name);
	if (!found) {
		return toolFailure(context.translate("server:agent.skill.unavailable"));
	}

	return toolResult({ name: found.name, instructions: found.instructions });
};

export default skill;
