import { referenceKey } from "../../../libs/agent/references.js";
import { copy } from "../../../libs/i18n/index.js";
import type { AgentToolResult } from "../../../libs/tools/types.js";
import type { ServiceFn } from "../../../utils/services/types.js";
import describe from "../references/describe.js";
import list from "../references/list.js";

const pageSize = 50;

/** Reads a bounded page of a chat's linked resources that the principal can read, with their names and file types. */
const readReferences: ServiceFn<
	[{ conversationId: string; userId: number | null; offset: number }],
	AgentToolResult<Record<string, unknown>>
> = async (context, input) => {
	const links = await list(context, {
		conversationId: input.conversationId,
		userId: input.userId,
	});
	if (links.error) return links;

	const end = input.offset + pageSize;
	const page = links.data.slice(input.offset, end);
	const details = await describe(context, { references: page });
	if (details.error) return details;

	const references = page.flatMap(({ source, ...reference }) => {
		const detail = details.data.get(referenceKey(reference));
		return detail
			? [
					{
						...reference,
						name: detail.label,
						...(detail.mimeType ? { mimeType: detail.mimeType } : {}),
						linkedBy: source.type === "tool" ? source.toolName : "person",
					},
				]
			: [];
	});

	return {
		error: undefined,
		data: {
			output: {
				references,
				nextOffset: end < links.data.length ? end : null,
			},
			summary: copy(
				references.length === 1
					? "admin:core.tools.lucid_list_references.summary.one"
					: "admin:core.tools.lucid_list_references.summary",
				{ data: { count: references.length } },
			),
		},
	};
};

export default readReferences;
