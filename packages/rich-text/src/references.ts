import { type RichTextJSON, richTextNodeNames } from "./types.js";

/** Returns the stable refs for bricks owned by a rich-text document. */
export const extractEmbeddedBrickRefs = (
	json: RichTextJSON | null,
): string[] => {
	if (!json) return [];
	const refs = new Set<string>();

	const visit = (node: RichTextJSON) => {
		if (
			node.type === richTextNodeNames.embeddedBrick &&
			typeof node.attrs?.ref === "string"
		) {
			refs.add(node.attrs.ref);
		}
		for (const child of node.content ?? []) visit(child);
	};

	visit(json);
	return Array.from(refs);
};
