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
	  }
	| {
			type: "rich-text-mention";
			userId: unknown;
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

		if (node.type === richTextNodeNames.mention) {
			references.push({
				type: "rich-text-mention",
				userId: node.attrs?.userId,
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

/** A Lucid record that rich text links to. */
export type RichTextReferenceTarget =
	| { resource: "documents"; collectionKey: string; id: number }
	| { resource: "media"; id: number }
	| { resource: "users"; id: number };

/** Returns the ID to link instead, or null to leave the link out. */
export type RichTextReferenceMapper = (
	target: RichTextReferenceTarget,
) => number | null;

const documentTarget = (
	attrs: Record<string, unknown> | undefined,
): RichTextReferenceTarget | null =>
	typeof attrs?.collectionKey === "string" &&
	typeof attrs.documentId === "number"
		? {
				resource: "documents",
				collectionKey: attrs.collectionKey,
				id: attrs.documentId,
			}
		: null;

/**
 * Rewrites the document, media and user IDs rich text links to, eg. when importing content from another site.
 * Nodes whose target maps to null are removed, mentions keep their label as text and document links keep their text.
 */
export const mapRichTextReferences = (
	json: RichTextJSON,
	map: RichTextReferenceMapper,
): RichTextJSON => {
	const visit = (node: RichTextJSON): RichTextJSON[] => {
		const attrs = node.attrs;
		let id: number | null | undefined;
		let key: "documentId" | "mediaId" | "userId" | undefined;

		if (node.type === richTextNodeNames.document) {
			const target = documentTarget(attrs);
			key = "documentId";
			id = target ? map(target) : undefined;
		} else if (
			node.type === richTextNodeNames.media &&
			typeof attrs?.mediaId === "number"
		) {
			key = "mediaId";
			id = map({ resource: "media", id: attrs.mediaId });
		} else if (node.type === richTextNodeNames.variable) {
			if (attrs?.source === "user" && typeof attrs.userId === "number") {
				key = "userId";
				id = map({ resource: "users", id: attrs.userId });
			} else if (attrs?.source === "document") {
				const target = documentTarget(attrs);
				key = "documentId";
				id = target ? map(target) : undefined;
			}
		} else if (
			node.type === richTextNodeNames.mention &&
			typeof attrs?.userId === "number"
		) {
			key = "userId";
			id = map({ resource: "users", id: attrs.userId });
			if (id === null) {
				return typeof attrs.label === "string" && attrs.label.length > 0
					? [{ type: "text", text: `@${attrs.label}`, marks: node.marks }]
					: [];
			}
		}
		if (id === null) return [];

		//* invalid values are left for validation to report
		const marks = (Array.isArray(node.marks) ? node.marks : undefined)?.flatMap(
			(mark) => {
				if (mark.type !== "link" || mark.attrs?.kind !== "document") {
					return [mark];
				}
				const target = documentTarget(mark.attrs);
				const documentId = target ? map(target) : undefined;
				if (documentId === null) return [];
				return documentId === undefined
					? [mark]
					: [{ ...mark, attrs: { ...mark.attrs, documentId } }];
			},
		);

		return [
			{
				...node,
				...(key && id !== undefined ? { attrs: { ...attrs, [key]: id } } : {}),
				...(marks ? { marks } : {}),
				...(Array.isArray(node.content)
					? {
							content: node.content.flatMap((child) =>
								typeof child === "object" && child !== null
									? visit(child)
									: [child],
							),
						}
					: {}),
			},
		];
	};

	return visit(json)[0] ?? { type: "doc", content: [] };
};

/** Removes embedded brick nodes whose refs are given, eg. bricks an import leaves out. */
export const removeRichTextEmbeddedBricks = (
	json: RichTextJSON,
	refs: ReadonlySet<string>,
): RichTextJSON => {
	const visit = (node: RichTextJSON): RichTextJSON[] => {
		if (
			node.type === richTextNodeNames.embeddedBrick &&
			typeof node.attrs?.ref === "string" &&
			refs.has(node.attrs.ref)
		) {
			return [];
		}
		return [
			Array.isArray(node.content)
				? {
						...node,
						content: node.content.flatMap((child) =>
							typeof child === "object" && child !== null
								? visit(child)
								: [child],
						),
					}
				: node,
		];
	};

	return visit(json)[0] ?? { type: "doc", content: [] };
};
