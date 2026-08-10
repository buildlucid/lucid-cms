import { type RichTextJSON, richTextNodeNames } from "./types.js";

export type RichTextReference =
	| {
			type: "media";
			mediaId: unknown;
	  }
	| {
			type: "variable";
			collectionKey: unknown;
			documentId: unknown;
			fieldKey: unknown;
	  }
	| {
			type: "document-link";
			collectionKey: unknown;
			documentId: unknown;
	  }
	| {
			type: "embedded-brick";
			ref: unknown;
	  };

/** Extracts every Lucid reference from rich-text JSON. */
export const extractRichTextReferences = (
	json: RichTextJSON | null,
): RichTextReference[] => {
	if (!json) return [];
	const references: RichTextReference[] = [];

	const visit = (node: RichTextJSON) => {
		if (node.type === richTextNodeNames.media) {
			references.push({ type: "media", mediaId: node.attrs?.mediaId });
		}

		if (node.type === richTextNodeNames.variable) {
			references.push({
				type: "variable",
				collectionKey: node.attrs?.collectionKey,
				documentId: node.attrs?.documentId,
				fieldKey: node.attrs?.fieldKey,
			});
		}

		if (node.type === richTextNodeNames.embeddedBrick) {
			references.push({
				type: "embedded-brick",
				ref: node.attrs?.ref,
			});
		}

		for (const mark of node.marks ?? []) {
			if (mark.type !== "link" || mark.attrs?.kind !== "document") continue;
			references.push({
				type: "document-link",
				collectionKey: mark.attrs.collectionKey,
				documentId: mark.attrs.documentId,
			});
		}

		for (const child of node.content ?? []) visit(child);
	};

	visit(json);
	return references;
};

/** Returns the stable refs for bricks owned by a rich-text document. */
export const extractEmbeddedBrickRefs = (
	json: RichTextJSON | null,
): string[] => {
	return Array.from(
		new Set(
			extractRichTextReferences(json).flatMap((reference) =>
				reference.type === "embedded-brick" && typeof reference.ref === "string"
					? [reference.ref]
					: [],
			),
		),
	);
};
