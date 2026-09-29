import runnerTools from "../../../../libs/agent/runner-tools.js";
import {
	AgentDocumentReferencesRepository,
	AgentMediaReferencesRepository,
} from "../../../../libs/repositories/index.js";
import list from "../../references/list.js";
import { toolFailure } from "../tool-outcome.js";
import type { RunnerToolHandler } from "./types.js";

/** Unlinks tool-added resources within this chat, preserving user attachments. */
const removeReference: RunnerToolHandler = async (context, { call, run }) => {
	const input = runnerTools.removeReference.input.safeParse(call.input);
	if (!input.success) {
		return toolFailure(context.translate("server:agent.references.invalid"));
	}

	const references = await list(context, {
		conversationId: run.conversation_id,
		userId: run.user_id,
	});
	if (references.error) {
		return toolFailure(
			context.translate(references.error.message) ??
				context.translate("server:agent.references.unavailable"),
		);
	}

	const reference = references.data.find(
		({ id }) => id === input.data.referenceId,
	);
	if (reference?.source.type === "message") {
		return toolFailure(
			context.translate("server:agent.references.user.attached"),
		);
	}

	if (reference) {
		const deletion = {
			where: [
				{ key: "id", operator: "=", value: reference.id },
				{ key: "conversation_id", operator: "=", value: run.conversation_id },
				// A user may attach the resource after the lookup.
				{ key: "source", operator: "=", value: "tool" },
			],
		} satisfies Parameters<AgentMediaReferencesRepository["deleteMultiple"]>[0];

		const removed =
			reference.type === "media"
				? await new AgentMediaReferencesRepository(context.db).deleteMultiple(
						deletion,
					)
				: await new AgentDocumentReferencesRepository(
						context.db,
					).deleteMultiple(deletion);
		if (removed.error) {
			return toolFailure(
				context.translate(removed.error.message) ??
					context.translate("server:agent.references.unavailable"),
			);
		}
	}

	return {
		kind: "result",
		failed: false,
		output: { referenceId: input.data.referenceId },
	};
};

export default removeReference;
