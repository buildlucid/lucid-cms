import { referenceKey } from "../../../../libs/agent/references.js";
import type runnerTools from "../../../../libs/agent/runner-tools.js";
import { copy } from "../../../../libs/i18n/index.js";
import describe from "../../references/describe.js";
import list from "../../references/list.js";
import { toolFailure, toolResult } from "../tool-outcome.js";
import type { RunnerToolInputHandler } from "./types.js";

const pageSize = 50;

/** Reads a bounded page of the chat's linked resources, with their names and file types. */
const references: RunnerToolInputHandler<
	typeof runnerTools.references
> = async (context, { input, run }) => {
	const unavailable = () =>
		toolFailure(context.translate("server:agent.references.unavailable"));

	const links = await list(context, {
		conversationId: run.conversation_id,
		userId: run.user_id,
	});
	if (links.error) return unavailable();

	const end = input.offset + pageSize;
	const page = links.data.slice(input.offset, end);
	const details = await describe(context, { references: page });
	if (details.error) return unavailable();

	const output = {
		references: page.flatMap(({ source, ...reference }) => {
			const detail = details.data.get(referenceKey(reference));
			return detail
				? [
						{
							...reference,
							name: detail.label,
							...(detail.mimeType ? { mimeType: detail.mimeType } : {}),
							linkedBy: source.type === "tool" ? source.toolName : "user",
						},
					]
				: [];
		}),
		nextOffset: end < links.data.length ? end : null,
	};
	return toolResult({
		output,
		summary: copy(
			output.references.length === 1
				? "admin:core.tools.lucid_list_references.summary.one"
				: "admin:core.tools.lucid_list_references.summary",
			{ data: { count: output.references.length } },
		),
	});
};

export default references;
