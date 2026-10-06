import {
	extractRichTextReferences,
	type RichTextJSON,
	richTextNodeNames,
} from "@lucidcms/rich-text";
import { copy } from "../../../libs/i18n/index.js";
import type { ServiceFn } from "../../../utils/services/types.js";
import type { ReleaseDocumentRecord } from "../types.js";
import getReleaseReaders from "./get-release-readers.js";

/**
 * Checks everyone mentioned in a comment or description can read the
 * release. Each mention's label is set from the person's current name, so it
 * can't be made up.
 */
const resolveMentions: ServiceFn<
	[
		{
			release: {
				documents: Array<Pick<ReleaseDocumentRecord, "collection_key">>;
			};
			body: RichTextJSON;
		},
	],
	RichTextJSON
> = async (context, data) => {
	const userIds = extractRichTextReferences(data.body).flatMap((reference) =>
		reference.type === "rich-text-mention" ? [reference.userId] : [],
	);
	if (userIds.length === 0) return { error: undefined, data: data.body };

	const readersRes = await getReleaseReaders(context, {
		release: data.release,
	});
	if (readersRes.error) return readersRes;

	const readers = new Map(readersRes.data.map((user) => [user.id, user]));
	if (userIds.some((id) => typeof id !== "number" || !readers.has(id))) {
		return {
			error: {
				type: "basic",
				message: copy("server:core.releases.comment.mention.invalid"),
				status: 400,
			},
			data: undefined,
		};
	}

	const relabel = (node: RichTextJSON): RichTextJSON => {
		if (node.type === richTextNodeNames.mention) {
			const user = readers.get(node.attrs?.userId);
			if (!user) return node;
			const name = [user.firstName, user.lastName].filter(Boolean).join(" ");
			return {
				...node,
				attrs: { ...node.attrs, label: name || user.username || user.email },
			};
		}
		if (!node.content) return node;
		return { ...node, content: node.content.map(relabel) };
	};

	return { error: undefined, data: relabel(data.body) };
};

export default resolveMentions;
