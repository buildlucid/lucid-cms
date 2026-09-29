import { expect, it } from "vitest";
import {
	canAgentOpen,
	preserveSelectedDocumentVersions,
} from "./agent-references";

it("keeps pinned versions when confirming a document selector and drops deselected documents", () => {
	const references = preserveSelectedDocumentVersions(
		[
			{ type: "media", mediaId: 12 },
			{ type: "document", collectionKey: "pages", documentId: 4, versionId: 9 },
			{
				type: "document",
				collectionKey: "pages",
				documentId: 4,
				versionId: 10,
			},
			{ type: "document", collectionKey: "pages", documentId: 7 },
		],
		[
			{ type: "document", collectionKey: "pages", documentId: 4 },
			{ type: "document", collectionKey: "pages", documentId: 4 },
			{ type: "document", collectionKey: "posts", documentId: 4 },
		],
	);
	expect(references).toEqual([
		{ type: "document", collectionKey: "pages", documentId: 4, versionId: 9 },
		{ type: "document", collectionKey: "pages", documentId: 4, versionId: 10 },
		{ type: "document", collectionKey: "posts", documentId: 4 },
	]);
});

it("opens media only when a tool accepts its type, and leaves documents unanswered", () => {
	const capabilities = {
		media: { mimeTypes: ["application/pdf", "image/*"] },
		webSearch: false,
		webRead: false,
	};
	const media = (mimeType?: string) => ({
		type: "media" as const,
		mediaId: 1,
		label: "File",
		mimeType,
	});

	expect(canAgentOpen(media("application/pdf"), capabilities)).toBe(true);
	expect(canAgentOpen(media("image/webp"), capabilities)).toBe(true);
	expect(canAgentOpen(media("audio/mpeg"), capabilities)).toBe(false);
	expect(canAgentOpen(media(), capabilities)).toBe(false);
	expect(
		canAgentOpen(media("application/pdf"), { ...capabilities, media: null }),
	).toBe(false);
	expect(
		canAgentOpen(
			{ type: "document", collectionKey: "pages", documentId: 1, label: "Doc" },
			capabilities,
		),
	).toBeUndefined();
});
