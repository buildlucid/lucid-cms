import runnerTools from "../../../../libs/agent/runner-tools.js";
import { toolFailure } from "../tool-outcome.js";
import type { RunnerToolHandler } from "./types.js";

const skill: RunnerToolHandler = async (context, { call, setup }) => {
	const input = runnerTools.skill.input.safeParse(call.input);

	const found = setup.skills.find(
		(skill) => input.success && skill.name === input.data.name,
	);
	if (!found) {
		return toolFailure(context.translate("server:agent.skill.unavailable"));
	}

	return {
		kind: "result",
		output: { name: found.name, instructions: found.instructions },
		failed: false,
	};
};

export default skill;
