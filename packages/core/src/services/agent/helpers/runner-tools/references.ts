import { referenceKey } from "../../../../libs/agent/references.js";
import runnerTools from "../../../../libs/agent/runner-tools.js";
import describe from "../../references/describe.js";
import list from "../../references/list.js";
import { toolFailure } from "../tool-outcome.js";
import type { RunnerToolHandler } from "./types.js";

const pageSize = 50;

/** Reads a bounded page of the chat's linked resources, with their names and file types. */
const references: RunnerToolHandler = async (context, { call, run }) => {
	const input = runnerTools.references.input.safeParse(call.input);
	if (!input.success) {
		return toolFailure(context.translate("server:agent.references.invalid"));
	}

	const links = await list(context, {
		conversationId: run.conversation_id,
		userId: run.user_id,
	});
	if (links.error) {
		return toolFailure(
			context.translate("server:agent.references.unavailable"),
		);
	}

	const end = input.data.offset + pageSize;
	const page = links.data.slice(input.data.offset, end);
	const details = await describe(context, { references: page });
	if (details.error) {
		return toolFailure(
			context.translate("server:agent.references.unavailable"),
		);
	}

	return {
		kind: "result",
		failed: false,
		output: {
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
		},
	};
};

export default references;
