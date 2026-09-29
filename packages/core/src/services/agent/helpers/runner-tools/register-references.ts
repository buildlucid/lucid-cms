import runnerTools from "../../../../libs/agent/runner-tools.js";
import { getCollectionPermission } from "../../../../libs/permission/collection-permissions.js";
import { Permissions } from "../../../../libs/permission/definitions.js";
import resolveUserAccess from "../../../users/resolve-access.js";
import register from "../../references/register.js";
import { toolFailure } from "../tool-outcome.js";
import type { RunnerToolHandler } from "./types.js";

/** Links resources the run's principal can read. Attachment settings only govern user attachments. */
const registerReferences: RunnerToolHandler = async (
	context,
	{ call, run },
) => {
	const input = runnerTools.registerReferences.input.safeParse(call.input);
	if (!input.success) {
		return toolFailure(context.translate("server:agent.references.invalid"));
	}

	if (run.user_id !== null) {
		const access = await resolveUserAccess(context, { userId: run.user_id });
		if (access.error) {
			return toolFailure(
				context.translate(access.error.message) ??
					context.translate("server:agent.references.unavailable"),
			);
		}

		if (
			!access.data.superAdmin &&
			input.data.references.some(
				(reference) =>
					!access.data.permissions.includes(
						reference.type === "media"
							? Permissions.MediaRead
							: getCollectionPermission(reference.collectionKey, "read"),
					),
			)
		) {
			return toolFailure(
				context.translate("server:agent.references.register.denied"),
			);
		}
	}

	const result = await register(context, {
		conversationId: run.conversation_id,
		references: input.data.references,
		source: { type: "tool", toolName: runnerTools.registerReferences.name },
	});
	if (result.error) {
		return toolFailure(
			context.translate(result.error.message) ??
				context.translate("server:agent.references.unavailable"),
		);
	}

	return { kind: "result", failed: false, output: { references: result.data } };
};

export default registerReferences;
