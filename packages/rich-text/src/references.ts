import { type RichTextJSON, richTextNodeNames } from "./types.js";

/** Raw references whose attributes remain unknown until application validation. */
export type RichTextReference =
	| {
			type: "rich-text-document";
			collectionKey: unknown;
			documentId: unknown;
	  }
	| {
			type: "rich-text-media";
			mediaId: unknown;
	  }
	| {
			type: "rich-text-variable";
			source: unknown;
			collectionKey: unknown;
			documentId: unknown;
			userId: unknown;
			fieldKey: unknown;
	  }
	| {
			type: "rich-text-document-link";
			collectionKey: unknown;
			documentId: unknown;
	  }
	| {
			type: "rich-text-embedded-brick";
			ref: unknown;
	  };

/** Extracts every Lucid reference from rich-text JSON. */
export const extractRichTextReferences = (
	json: RichTextJSON | null,
): RichTextReference[] => {
	if (!json) return [];
	const references: RichTextReference[] = [];

	const visit = (node: RichTextJSON) => {
		if (node.type === richTextNodeNames.document) {
			references.push({
				type: "rich-text-document",
				collectionKey: node.attrs?.collectionKey,
				documentId: node.attrs?.documentId,
			});
		}

		if (node.type === richTextNodeNames.media) {
			references.push({
				type: "rich-text-media",
				mediaId: node.attrs?.mediaId,
			});
		}

		if (node.type === richTextNodeNames.variable) {
			references.push({
				type: "rich-text-variable",
				source: node.attrs?.source,
				collectionKey: node.attrs?.collectionKey,
				documentId: node.attrs?.documentId,
				userId: node.attrs?.userId,
				fieldKey: node.attrs?.fieldKey,
			});
		}

		if (node.type === richTextNodeNames.embeddedBrick) {
			references.push({
				type: "rich-text-embedded-brick",
				ref: node.attrs?.ref,
			});
		}

		for (const mark of node.marks ?? []) {
			if (mark.type !== "link" || mark.attrs?.kind !== "document") continue;
			references.push({
				type: "rich-text-document-link",
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
				reference.type === "rich-text-embedded-brick" &&
				typeof reference.ref === "string"
					? [reference.ref]
					: [],
			),
		),
	);
};
