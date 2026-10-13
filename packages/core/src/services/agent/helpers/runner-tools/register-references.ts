import type runnerTools from "../../../../libs/agent/runner-tools.js";
import { copy } from "../../../../libs/i18n/index.js";
import linkRequestedDocuments from "../../references/link-requested-documents.js";
import referenceAccess from "../../references/reference-access.js";
import register from "../../references/register.js";
import { toolErrorFailure, toolFailure, toolResult } from "../tool-outcome.js";
import type { RunnerToolInputHandler } from "./types.js";

/** Links resources the run's principal can read. Attachment settings only govern user attachments. */
const registerReferences: RunnerToolInputHandler<
	typeof runnerTools.registerReferences
> = async (context, { input, run, call, authority }) => {
	//* requested documents become their create request first, so the request's access applies
	const linked = await linkRequestedDocuments(context, {
		references: input.references,
	});
	if (linked.error) {
		return toolErrorFailure(
			context,
			linked.error,
			"server:agent.references.unavailable",
		);
	}

	const references = linked.data;
	const { principal } = authority;
	const access = await referenceAccess(context, {
		references,
		userId: principal.type === "user" ? principal.userId : null,
		grant: authority,
	});
	if (access.error) {
		return toolErrorFailure(
			context,
			access.error,
			"server:agent.references.unavailable",
		);
	}

	const denied = references.find(
		(reference) => !access.data.canRead(reference),
	);
	if (denied) {
		//* other users' personal and system media reads as missing, so IDs cannot reveal it exists
		const owner =
			denied.type === "media"
				? access.data.ownership.get(denied.mediaId)
				: undefined;
		const hidden = owner?.type === "user" || owner?.type === "system";
		return toolFailure(
			context.translate(
				hidden
					? "server:core.media.not.found.message"
					: "server:agent.references.register.denied",
			),
		);
	}

	const result = await register(context, {
		conversationId: run.conversation_id,
		references,
		source: { type: "tool", toolName: call.name },
	});
	if (result.error) {
		return toolErrorFailure(
			context,
			result.error,
			"server:agent.references.unavailable",
		);
	}

	return toolResult({
		output: { references: result.data },
		summary: copy(
			result.data.length === 1
				? "admin:core.tools.lucid_register_references.summary.one"
				: "admin:core.tools.lucid_register_references.summary",
			{ data: { count: result.data.length } },
		),
	});
};

export default registerReferences;
