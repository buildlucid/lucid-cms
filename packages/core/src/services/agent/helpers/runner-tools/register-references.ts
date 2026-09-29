import { referenceReadPermission } from "../../../../libs/agent/references.js";
import runnerTools from "../../../../libs/agent/runner-tools.js";
import hasPermission from "../../../../libs/permission/has-permission.js";
import resolveUserAccess from "../../../users/resolve-access.js";
import register from "../../references/register.js";
import { toolErrorFailure, toolFailure, toolResult } from "../tool-outcome.js";
import type { RunnerToolInputHandler } from "./types.js";

/** Links resources the run's principal can read. Attachment settings only govern user attachments. */
const registerReferences: RunnerToolInputHandler<
	typeof runnerTools.registerReferences
> = async (context, { input, run }) => {
	if (run.user_id !== null) {
		const access = await resolveUserAccess(context, { userId: run.user_id });
		if (access.error) {
			return toolErrorFailure(
				context,
				access.error,
				"server:agent.references.unavailable",
			);
		}

		if (
			input.references.some(
				(reference) =>
					!hasPermission(access.data, referenceReadPermission(reference)),
			)
		) {
			return toolFailure(
				context.translate("server:agent.references.register.denied"),
			);
		}
	}

	const result = await register(context, {
		conversationId: run.conversation_id,
		references: input.references,
		source: { type: "tool", toolName: runnerTools.registerReferences.name },
	});
	if (result.error) {
		return toolErrorFailure(
			context,
			result.error,
			"server:agent.references.unavailable",
		);
	}

	return toolResult({ references: result.data });
};

export default registerReferences;
