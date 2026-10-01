import { expect, it } from "vitest";
import {
	canAgentOpen,
	canAttachMedia,
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
		mediaAnalysis: { mimeTypes: ["application/pdf", "image/*"] },
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
		canAgentOpen(media("application/pdf"), {
			...capabilities,
			mediaAnalysis: null,
		}),
	).toBe(false);
	expect(
		canAgentOpen(
			{ type: "document", collectionKey: "pages", documentId: 1, label: "Doc" },
			capabilities,
		),
	).toBeUndefined();
});

it("attaches personal files with uploads alone, and library media only with attachments and read access", () => {
	const features = (upload: boolean, attach: boolean) => ({
		media: { upload, attach },
		documents: { attach: false },
	});
	const personal = { ownership: { type: "user" as const, userId: 1 } };
	const library = { ownership: { type: "library" as const } };

	expect(
		canAttachMedia(personal, {
			features: features(true, false),
			canReadLibrary: false,
		}),
	).toBe(true);
	expect(
		canAttachMedia(library, {
			features: features(true, false),
			canReadLibrary: true,
		}),
	).toBe(false);
	expect(
		canAttachMedia(library, {
			features: features(false, true),
			canReadLibrary: false,
		}),
	).toBe(false);
	expect(
		canAttachMedia(library, {
			features: features(false, true),
			canReadLibrary: true,
		}),
	).toBe(true);
	expect(
		canAttachMedia(
			{ ownership: { type: "system" } },
			{ features: features(true, true), canReadLibrary: true },
		),
	).toBe(false);
});
