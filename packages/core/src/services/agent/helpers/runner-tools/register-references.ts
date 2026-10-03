import { canReadReference } from "../../../../libs/agent/references.js";
import type runnerTools from "../../../../libs/agent/runner-tools.js";
import { copy } from "../../../../libs/i18n/index.js";
import resolveUserAccess from "../../../users/resolve-access.js";
import mediaOwnership from "../../references/media-ownership.js";
import register from "../../references/register.js";
import { toolErrorFailure, toolFailure, toolResult } from "../tool-outcome.js";
import type { RunnerToolInputHandler } from "./types.js";

/** Links resources the run's principal can read. Attachment settings only govern user attachments. */
const registerReferences: RunnerToolInputHandler<
	typeof runnerTools.registerReferences
> = async (context, { input, run, call }) => {
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

	const denied = input.references.find(
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
	);
	if (denied) {
		//* other users' personal and system media reads as missing, so IDs cannot reveal it exists
		const owner =
			denied.type === "media" ? ownership.data?.get(denied.mediaId) : undefined;
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
		references: input.references,
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
