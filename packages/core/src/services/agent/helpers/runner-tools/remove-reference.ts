import type runnerTools from "../../../../libs/agent/runner-tools.js";
import { copy } from "../../../../libs/i18n/index.js";
import list from "../../references/list.js";
import remove from "../../references/remove.js";
import { toolErrorFailure, toolFailure, toolResult } from "../tool-outcome.js";
import type { RunnerToolInputHandler } from "./types.js";

/** Unlinks tool-added resources within this chat, preserving user attachments. */
const removeReference: RunnerToolInputHandler<
	typeof runnerTools.removeReference
> = async (context, { input, run }) => {
	const references = await list(context, {
		conversationId: run.conversation_id,
		userId: run.user_id,
	});
	if (references.error) {
		return toolErrorFailure(
			context,
			references.error,
			"server:agent.references.unavailable",
		);
	}

	const reference = references.data.find(({ id }) => id === input.referenceId);
	if (reference?.source.type === "message") {
		return toolFailure(
			context.translate("server:agent.references.user.attached"),
		);
	}

	if (reference) {
		//* limited to tool links, as a person may attach the resource after the lookup
		const removed = await remove(context, {
			conversationId: run.conversation_id,
			referenceId: reference.id,
			source: "tool",
		});
		if (removed.error) {
			return toolErrorFailure(
				context,
				removed.error,
				"server:agent.references.unavailable",
			);
		}
	}

	return toolResult({
		output: { referenceId: input.referenceId },
		summary: copy(
			reference
				? "admin:core.tools.lucid_remove_reference.summary"
				: "admin:core.tools.lucid_remove_reference.absent.summary",
		),
	});
};

export default removeReference;
