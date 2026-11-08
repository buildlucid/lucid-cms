import type runnerTools from "../../../../libs/agent/runner-tools.js";
import readReferences from "../read-references.js";
import { toolFailure, toolResult } from "../tool-outcome.js";
import type { RunnerToolInputHandler } from "./types.js";

/** Reads a bounded page of the chat's linked resources, with their names and file types. */
const references: RunnerToolInputHandler<
	typeof runnerTools.references
> = async (context, { input, run }) => {
	const page = await readReferences(context, {
		conversationId: run.conversation_id,
		userId: run.user_id,
		offset: input.offset,
	});
	if (page.error) {
		return toolFailure(
			context.translate("server:agent.references.unavailable"),
		);
	}

	return toolResult(page.data);
};

export default references;
