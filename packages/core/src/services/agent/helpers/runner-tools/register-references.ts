import { canReadReference } from "../../../../libs/agent/references.js";
import runnerTools from "../../../../libs/agent/runner-tools.js";
import resolveUserAccess from "../../../users/resolve-access.js";
import mediaOwnership from "../../references/media-ownership.js";
import register from "../../references/register.js";
import { toolErrorFailure, toolFailure, toolResult } from "../tool-outcome.js";
import type { RunnerToolInputHandler } from "./types.js";

/** Links resources the run's principal can read. Attachment settings only govern user attachments. */
const registerReferences: RunnerToolInputHandler<
	typeof runnerTools.registerReferences
> = async (context, { input, run }) => {
	const [access, ownership] = await Promise.all([
		run.user_id === null
			? undefined
			: resolveUserAccess(context, { userId: run.user_id }),
		mediaOwnership(context, {
			mediaIds: input.references.flatMap((reference) =>
				reference.type === "media" ? [reference.mediaId] : [],
			),
		}),
	]);
	const failure = access?.error ?? ownership.error;
	if (failure) {
		return toolErrorFailure(
			context,
			failure,
			"server:agent.references.unavailable",
		);
	}

	if (
		input.references.some(
			(reference) =>
				!canReadReference({
					reference,
					ownership:
						reference.type === "media"
							? ownership.data?.get(reference.mediaId)
							: undefined,
					userId: run.user_id,
					grant: access?.data,
				}),
		)
	) {
		return toolFailure(
			context.translate("server:agent.references.register.denied"),
		);
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
