import { describe, expect, test } from "vitest";
import {
	getReadableRichTextUserVariableFields,
	getReadableRichTextVariableCollectionKeys,
	getRichTextVariableAttrs,
	richTextHasContent,
} from "./helpers";

describe("getReadableRichTextVariableCollectionKeys", () => {
	test("only returns configured collections the editor can read", () => {
		expect(
			getReadableRichTextVariableCollectionKeys(
				["settings", "pages"],
				["settings"],
			),
		).toEqual(["settings"]);
	});

	test("returns every readable collection when all are configured", () => {
		expect(
			getReadableRichTextVariableCollectionKeys(true, ["settings", "pages"]),
		).toEqual(["settings", "pages"]);
	});
});

describe("getReadableRichTextUserVariableFields", () => {
	test("removes configured fields without users read permission", () => {
		expect(
			getReadableRichTextUserVariableFields(["username", "email"], false),
		).toEqual([]);
	});

	test("keeps configured fields with users read permission", () => {
		expect(
			getReadableRichTextUserVariableFields(["username", "email"], true),
		).toEqual(["username", "email"]);
	});
});

describe("richTextHasContent", () => {
	test("treats an empty document as empty", () => {
		expect(
			richTextHasContent({
				type: "doc",
				content: [{ type: "paragraph" }],
			}),
		).toBe(false);
	});

	test("recognises text and reference nodes as content", () => {
		expect(
			richTextHasContent({
				type: "doc",
				content: [
					{ type: "paragraph", content: [{ type: "text", text: "Hello" }] },
				],
			}),
		).toBe(true);
		expect(
			richTextHasContent({
				type: "doc",
				content: [{ type: "lucidMedia", attrs: { mediaId: 1 } }],
			}),
		).toBe(true);
		expect(
			richTextHasContent({
				type: "doc",
				content: [
					{
						type: "lucidDocument",
						attrs: { collectionKey: "pages", documentId: 1 },
					},
				],
			}),
		).toBe(true);
	});
});

describe("getRichTextVariableAttrs", () => {
	test("builds document variable attributes with an immediate value", () => {
		expect(
			getRichTextVariableAttrs({
				source: "document",
				collectionKey: "settings",
				documentId: 2,
				fieldKey: "siteName",
				document: {
					id: 2,
					collectionKey: "settings",
					route: null,
					fields: {
						siteName: {
							key: "siteName",
							type: "text",
							value: "Lucid",
						},
					},
				},
			}),
		).toEqual({
			source: "document",
			collectionKey: "settings",
			documentId: 2,
			userId: null,
			fieldKey: "siteName",
			value: "Lucid",
		});
	});

	test("builds user variable attributes with an immediate value", () => {
		expect(
			getRichTextVariableAttrs({
				source: "user",
				userId: 9,
				fieldKey: "firstName",
				user: {
					id: 9,
					username: "william",
					email: "william@example.com",
					firstName: "William",
					lastName: "Yallop",
					profilePicture: null,
				},
			}),
		).toEqual({
			source: "user",
			collectionKey: null,
			documentId: null,
			userId: 9,
			fieldKey: "firstName",
			value: "William",
		});
	});
});
