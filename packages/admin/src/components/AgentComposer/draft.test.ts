// @vitest-environment happy-dom
import { beforeEach, describe, expect, it } from "vitest";
import { readDraft, restoreSubmittedDraft, writeDraft } from "./draft";

beforeEach(() => sessionStorage.clear());

describe("agent drafts", () => {
	it("restores attachment-only drafts with their details and keeps chats separate", () => {
		const draft = {
			text: "",
			references: [
				{
					type: "media" as const,
					mediaId: 12,
					label: "Campaign hero",
					mimeType: "image/png",
					previewUrl: "https://example.com/hero.png",
				},
				{
					type: "document" as const,
					collectionKey: "pages",
					documentId: 4,
					versionId: 9,
					label: "Homepage",
				},
			],
		};
		writeDraft("first", draft);
		expect(readDraft("first")).toEqual(draft);
		expect(readDraft("second")).toEqual({ text: "", references: [] });
		writeDraft("first", { text: "", references: [] });
		expect(sessionStorage.getItem("lucid:agent-draft:first")).toBeNull();
	});

	it("ignores invalid stored references and labels missing details", () => {
		sessionStorage.setItem(
			"lucid:agent-draft:chat",
			JSON.stringify({
				text: "Keep this",
				references: [
					{ type: "media", mediaId: "12" },
					null,
					{ type: "document", documentId: 4 },
					{ type: "media", mediaId: 8, label: 5 },
				],
			}),
		);
		const restored = readDraft("chat");
		expect(restored.text).toBe("Keep this");
		expect(restored.references).toHaveLength(1);
		expect(restored.references[0]).toMatchObject({ type: "media", mediaId: 8 });
		expect(restored.references[0]?.label).toContain("#8");
	});
});

it("restores failed input without losing the text and references written meanwhile", () => {
	const restored = restoreSubmittedDraft(
		{
			text: "Review these",
			references: [
				{
					type: "document",
					collectionKey: "pages",
					documentId: 4,
					versionId: 9,
					label: "Homepage",
				},
			],
		},
		{
			text: "And this",
			references: [{ type: "media", mediaId: 12, label: "Hero" }],
		},
	);
	expect(restored.text).toBe("Review these\n\nAnd this");
	expect(restored.references).toEqual([
		{
			type: "document",
			collectionKey: "pages",
			documentId: 4,
			versionId: 9,
			label: "Homepage",
		},
		{ type: "media", mediaId: 12, label: "Hero" },
	]);
});
