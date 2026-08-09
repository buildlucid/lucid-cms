import { describe, expect, test } from "vitest";
import CollectionBuilder from "../../../libs/collection/builders/collection-builder/index.js";
import { copy } from "../../../libs/i18n/index.js";
import type { ServiceContext } from "../../../utils/services/types.js";
import extractRelatedEntityIds from "./extract-related-entity-ids.js";

const collection = new CollectionBuilder("pages", {
	mode: "multiple",
	details: {
		name: copy("admin:tests.collections.pages.name", {
			defaultMessage: "Pages",
		}),
		singularName: copy("admin:tests.collections.pages.singularName", {
			defaultMessage: "Page",
		}),
	},
}).addRichText("body");

const context = {
	config: {
		db: { config: { tableNameByteLimit: null } },
	},
} as unknown as ServiceContext;

describe("extractRelatedEntityIds", () => {
	test("adds refs embedded in a JSON custom-field column to normal ref buckets", async () => {
		const table = "lucid_document__pages__fld" as const;
		const result = await extractRelatedEntityIds(context, {
			collection,
			brickSchema: [
				{
					name: table,
					rawName: table,
					type: "document-fields",
					key: { collection: "pages" },
					columns: [
						{
							name: "_body",
							source: "field",
							type: "json",
							customField: { type: "rich-text" },
						},
					],
				},
			],
			responses: [
				{
					[table]: [
						{
							id: 1,
							collection_key: "pages",
							document_id: 1,
							document_version_id: 1,
							locale: "en",
							position: 0,
							is_open: 1,
							_body: {
								type: "doc",
								content: [
									{ type: "lucidMedia", attrs: { mediaId: 4 } },
									{
										type: "paragraph",
										content: [
											{
												type: "text",
												text: "Article",
												marks: [
													{
														type: "link",
														attrs: {
															kind: "document",
															collectionKey: "articles",
															documentId: 8,
														},
													},
												],
											},
										],
									},
								],
							},
						},
					],
				},
			],
		});

		expect(result.error).toBeUndefined();
		if (result.error) return;
		expect(result.data.media?.[0]?.table).toBe("lucid_media");
		expect(Array.from(result.data.media?.[0]?.values ?? [])).toEqual([4]);
		expect(result.data.relation?.[0]?.table).toBe("lucid_document__articles");
		expect(Array.from(result.data.relation?.[0]?.values ?? [])).toEqual([8]);
	});
});
