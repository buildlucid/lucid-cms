import type runnerTools from "../../../../libs/agent/runner-tools.js";
import { copy } from "../../../../libs/i18n/index.js";
import { toolFailure, toolResult } from "../tool-outcome.js";
import type { RunnerToolInputHandler } from "./types.js";

const skill: RunnerToolInputHandler<typeof runnerTools.skill> = async (
	context,
	{ input, setup },
) => {
	const found = setup.skills.find((skill) => skill.name === input.name);
	if (!found) {
		return toolFailure(context.translate("server:agent.skill.unavailable"));
	}

	return toolResult({
		output: { name: found.name, instructions: found.instructions },
		summary: copy("admin:core.tools.lucid_load_skill.summary", {
			data: { name: found.name },
		}),
	});
};

export default skill;
