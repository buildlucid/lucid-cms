import { describe, expect, test } from "vitest";
import CollectionBuilder from "../../../libs/collection/builders/collection-builder/index.js";
import { copy } from "../../../libs/i18n/index.js";
import type { ServiceContext } from "../../../utils/services/types.js";
import collectRefTargets from "./collect-ref-targets.js";

const collection = new CollectionBuilder("pages", {
	mode: "multiple",
	details: {
		labels: {
			singular: copy("admin:tests.collections.pages.singularName", {
				defaultMessage: "Page",
			}),
			plural: copy("admin:tests.collections.pages.name", {
				defaultMessage: "Pages",
			}),
		},
	},
}).addRichText("body");

const context = {
	config: {
		db: { config: { tableNameByteLimit: null } },
	},
} as unknown as ServiceContext;

describe("collectRefTargets", () => {
	test("adds refs embedded in a JSON custom-field column to resource buckets", async () => {
		const table = "lucid_document__pages__fld" as const;
		const result = await collectRefTargets(context, {
			collection,
			resources: [],
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
										type: "lucidVariable",
										attrs: {
											source: "user",
											userId: 5,
											fieldKey: "username",
										},
									},
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
		expect(Array.from(result.data.media?.get("lucid_media") ?? [])).toEqual([
			4,
		]);
		expect(
			Array.from(result.data.documents?.get("lucid_document__articles") ?? []),
		).toEqual([8]);
		expect(Array.from(result.data.users?.get("lucid_users") ?? [])).toEqual([
			5,
		]);
	});

	test("omits a rich-text ref to the document being fetched", async () => {
		const table = "lucid_document__pages__fld" as const;
		const result = await collectRefTargets(context, {
			collection,
			resources: [],
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
									{
										type: "lucidDocument",
										attrs: {
											collectionKey: "pages",
											documentId: 1,
										},
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
		expect(result.data.documents).toBeUndefined();
	});
});
