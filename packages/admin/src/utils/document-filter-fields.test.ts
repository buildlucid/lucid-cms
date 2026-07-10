import type { Collection, ResolvedAdminCopy } from "@types";
import { describe, expect, it } from "vitest";
import {
	buildDocumentFilterSchema,
	documentFilterFields,
	documentFilterSectionFields,
	filterValueInputType,
	formatRelationFilterValue,
	isEntityPickerFieldType,
	operatorsForFieldType,
	parseRelationFilterValue,
} from "./document-filter-fields";

const literal = (value: string): ResolvedAdminCopy => ({
	type: "lucid.literal",
	value,
});

//* only the properties documentFilterFields reads are populated
const buildCollection = (
	fields: unknown[],
	fixedBricks: unknown[] = [],
	builderBricks: unknown[] = [],
): Collection =>
	({
		fields,
		fixedBricks,
		builderBricks,
	}) as unknown as Collection;

describe("documentFilterFields", () => {
	it("maps supported collection fields to underscore-prefixed keys", () => {
		const fields = documentFilterFields(
			buildCollection([
				{ key: "title", type: "text", details: { label: literal("Title") } },
				{ key: "amount", type: "number", details: {} },
				{ key: "price", type: "range", details: {} },
			]),
		);

		expect(fields).toEqual([
			{ key: "_title", label: "Title", type: "text" },
			{ key: "_amount", label: "amount", type: "number" },
			{ key: "_price", label: "price", type: "range" },
		]);
	});

	it("excludes structured and unknown field types", () => {
		const fields = documentFilterFields(
			buildCollection([
				{ key: "body", type: "rich-text", details: {} },
				{ key: "config", type: "json", details: {} },
				{ key: "snippet", type: "code", details: {} },
				{ key: "cta", type: "link", details: {} },
				{ key: "legacy", type: "legacy", details: {} },
			]),
		);

		expect(fields).toEqual([]);
	});

	it("includes the full container path in the display name", () => {
		const fields = documentFilterFields(
			buildCollection([
				{
					key: "mainTab",
					type: "tab",
					details: { label: literal("Main") },
					fields: [
						{
							key: "seoSection",
							type: "section",
							details: { label: literal("SEO") },
							fields: [
								{
									key: "metaTitle",
									type: "text",
									details: { label: literal("Meta title") },
								},
							],
						},
						{
							key: "tabField",
							type: "text",
							details: { label: literal("Tab field") },
						},
					],
				},
			]),
		);

		expect(fields).toEqual([
			{ key: "_metaTitle", label: "Main > SEO > Meta title", type: "text" },
			{ key: "_tabField", label: "Main > Tab field", type: "text" },
		]);
	});

	it("traverses repeater children using the tree-table filter path", () => {
		const fields = documentFilterFields(
			buildCollection(
				[
					{
						key: "people",
						type: "repeater",
						details: { label: literal("People") },
						fields: [
							{
								key: "name",
								type: "text",
								details: { label: literal("Name") },
							},
						],
					},
				],
				[
					{
						key: "hero",
						details: { name: literal("Hero") },
						fields: [
							{
								key: "items",
								type: "repeater",
								details: { label: literal("Items") },
								fields: [
									{
										key: "itemTitle",
										type: "text",
										details: { label: literal("Item title") },
									},
								],
							},
						],
					},
				],
			),
		);

		expect(fields).toEqual([
			{ key: "fields.people._name", label: "People > Name", type: "text" },
			{
				key: "hero.items._itemTitle",
				label: "Hero > Items > Item title",
				type: "text",
			},
		]);
	});

	it("uses the innermost repeater key for nested repeater children", () => {
		const fields = documentFilterFields(
			buildCollection([
				{
					key: "outer",
					type: "repeater",
					details: {},
					fields: [
						{
							key: "inner",
							type: "repeater",
							details: {},
							fields: [{ key: "note", type: "text", details: {} }],
						},
					],
				},
			]),
		);

		expect(fields).toEqual([
			{
				key: "fields.inner._note",
				label: "outer > inner > note",
				type: "text",
			},
		]);
	});

	it("prefixes brick fields with the brick key and label", () => {
		const fields = documentFilterFields(
			buildCollection(
				[],
				[
					{
						key: "hero",
						details: { name: literal("Hero") },
						fields: [
							{
								key: "heading",
								type: "text",
								details: { label: literal("Heading") },
							},
						],
					},
				],
				[
					{
						key: "banner",
						details: { name: literal("Banner") },
						fields: [
							{
								key: "image",
								type: "media",
								details: { label: literal("Image") },
							},
						],
					},
				],
			),
		);

		expect(fields).toEqual([
			{ key: "hero._heading", label: "Hero > Heading", type: "text" },
			{ key: "banner._image", label: "Banner > Image", type: "media" },
		]);
	});

	it("dedupes options by query key", () => {
		const brick = {
			key: "hero",
			details: { name: literal("Hero") },
			fields: [{ key: "heading", type: "text", details: {} }],
		};
		const fields = documentFilterFields(buildCollection([], [brick], [brick]));

		expect(fields).toHaveLength(1);
		expect(fields[0]?.key).toBe("hero._heading");
	});

	it("carries select options, datetime time flag and checkbox labels", () => {
		const fields = documentFilterFields(
			buildCollection([
				{
					key: "status",
					type: "select",
					details: {},
					options: [{ label: literal("Draft"), value: "draft" }],
				},
				{ key: "publishedAt", type: "datetime", details: {}, time: false },
				{
					key: "featured",
					type: "checkbox",
					details: {
						true: literal("Shown"),
						false: literal("Hidden"),
					},
				},
			]),
		);

		expect(fields[0]).toMatchObject({
			key: "_status",
			type: "select",
			options: [{ value: "draft", label: "Draft" }],
		});
		expect(fields[1]).toMatchObject({
			key: "_publishedAt",
			type: "datetime",
			time: false,
		});
		expect(fields[2]).toMatchObject({
			key: "_featured",
			type: "checkbox",
			trueLabel: "Shown",
			falseLabel: "Hidden",
		});
	});

	it("carries relation collection keys for the document picker", () => {
		const fields = documentFilterFields(
			buildCollection([
				{
					key: "author",
					type: "relation",
					details: {},
					collection: "people",
				},
				{
					key: "related",
					type: "relation",
					details: {},
					collection: ["pages", "articles"],
				},
			]),
		);

		expect(fields[0]).toMatchObject({
			key: "_author",
			type: "relation",
			collections: ["people"],
		});
		expect(fields[1]).toMatchObject({
			key: "_related",
			type: "relation",
			collections: ["pages", "articles"],
		});
	});

	it("carries media picker constraints from field validation", () => {
		const fields = documentFilterFields(
			buildCollection([
				{
					key: "thumbnail",
					type: "media",
					details: {},
					validation: {
						type: "image",
						extensions: [".png", "jpg"],
					},
				},
				{ key: "attachment", type: "media", details: {} },
			]),
		);

		expect(fields[0]).toMatchObject({
			key: "_thumbnail",
			type: "media",
			mediaType: "image",
			mediaExtensions: "png,jpg",
		});
		expect(fields[1]).toEqual({
			key: "_attachment",
			label: "attachment",
			type: "media",
		});
	});

	it("adds no picker metadata to user fields", () => {
		const fields = documentFilterFields(
			buildCollection([{ key: "owner", type: "user", details: {} }]),
		);

		expect(fields).toEqual([{ key: "_owner", label: "owner", type: "user" }]);
	});
});

describe("documentFilterSectionFields", () => {
	it("adds management and configured workflow filters", () => {
		const collection = {
			...buildCollection([
				{ key: "title", type: "text", details: { label: literal("Title") } },
			]),
			workflow: {
				initial: "draft",
				stages: [
					{
						key: "draft",
						name: literal("Draft"),
						color: "grey",
						publishTargets: [],
						permissions: {},
					},
				],
			},
		} as Collection;

		expect(documentFilterSectionFields(collection)).toEqual(
			expect.arrayContaining([
				{ key: "_title", label: "Title", type: "text" },
				{
					key: "workflowStage",
					label: "Workflow Stage",
					type: "select",
					options: [{ value: "draft", label: "Draft" }],
				},
				{
					key: "workflowAssignee",
					label: "Assigned To",
					type: "user",
				},
				{ key: "createdBy", label: "Created By", type: "user" },
				{ key: "updatedBy", label: "Updated By", type: "user" },
				{ key: "createdAt", label: "Created At", type: "datetime" },
				{ key: "updatedAt", label: "Updated At", type: "datetime" },
			]),
		);
	});
});

describe("isEntityPickerFieldType", () => {
	it("flags user, relation and media fields only", () => {
		expect(isEntityPickerFieldType("user")).toBe(true);
		expect(isEntityPickerFieldType("relation")).toBe(true);
		expect(isEntityPickerFieldType("media")).toBe(true);
		expect(isEntityPickerFieldType("text")).toBe(false);
		expect(isEntityPickerFieldType("number")).toBe(false);
	});
});

describe("filterValueInputType", () => {
	it("falls back to ID inputs for entity picker fields", () => {
		expect(
			filterValueInputType({ key: "_owner", label: "Owner", type: "user" }),
		).toBe("number");
		//* relation values also accept the `collectionKey:id` form
		expect(
			filterValueInputType({
				key: "_author",
				label: "Author",
				type: "relation",
				collections: ["people"],
			}),
		).toBe("text");
		expect(
			filterValueInputType({ key: "_image", label: "Image", type: "media" }),
		).toBe("number");
	});

	it("keeps existing input types for non-entity fields", () => {
		expect(
			filterValueInputType({ key: "_title", label: "Title", type: "text" }),
		).toBe("text");
		expect(
			filterValueInputType({ key: "_amount", label: "Amount", type: "number" }),
		).toBe("number");
		expect(
			filterValueInputType({ key: "_price", label: "Price", type: "range" }),
		).toBe("number");
		expect(
			filterValueInputType({
				key: "_publishedAt",
				label: "Published",
				type: "datetime",
				time: false,
			}),
		).toBe("date");
		expect(
			filterValueInputType({
				key: "_publishedAt",
				label: "Published",
				type: "datetime",
			}),
		).toBe("datetime-local");
		expect(
			filterValueInputType({ key: "_tint", label: "Tint", type: "color" }),
		).toBe("color");
		expect(filterValueInputType(undefined)).toBe("text");
	});
});

describe("operatorsForFieldType", () => {
	it("uses backend operator tokens per field type", () => {
		expect(operatorsForFieldType("text")).toEqual([
			"=",
			"!=",
			"contains",
			"not-contains",
			"starts-with",
			"not-starts-with",
			"ends-with",
			"not-ends-with",
		]);
		expect(operatorsForFieldType("color")).toEqual(["=", "!="]);
		expect(operatorsForFieldType("number")).toEqual([
			"=",
			"!=",
			">",
			">=",
			"<",
			"<=",
		]);
		expect(operatorsForFieldType("range")).toEqual([
			"=",
			"!=",
			">",
			">=",
			"<",
			"<=",
		]);
		expect(operatorsForFieldType("checkbox")).toEqual(["="]);
		expect(operatorsForFieldType("relation")).toEqual(["=", "!="]);
	});
});

describe("buildDocumentFilterSchema", () => {
	it("maps field types to their filter codecs", () => {
		const schema = buildDocumentFilterSchema([
			{ key: "_title", label: "Title", type: "text" },
			{ key: "_featured", label: "Featured", type: "checkbox" },
			{ key: "_author", label: "Author", type: "user" },
			{ key: "_price", label: "Price", type: "range" },
			{ key: "_related", label: "Related", type: "relation" },
		]);

		expect(schema._title?.type).toBe("text");
		expect(schema._featured?.type).toBe("boolean");
		expect(schema._author?.type).toBe("number");
		expect(schema._price?.type).toBe("number");
		//* relation values may be `collectionKey:id` strings
		expect(schema._related?.type).toBe("text");
	});
});

describe("relation filter values", () => {
	it("round-trips compound collectionKey:id values", () => {
		const value = formatRelationFilterValue({ collectionKey: "pages", id: 7 });

		expect(value).toBe("pages:7");
		expect(parseRelationFilterValue(value)).toEqual({
			collectionKey: "pages",
			id: 7,
		});
	});

	it("parses plain numeric IDs without a collection key", () => {
		expect(parseRelationFilterValue(7)).toEqual({ id: 7 });
		expect(parseRelationFilterValue("7")).toEqual({ id: 7 });
	});

	it("rejects values that are neither IDs nor compound values", () => {
		expect(parseRelationFilterValue("")).toBeUndefined();
		expect(parseRelationFilterValue("Pages:7")).toBeUndefined();
		expect(parseRelationFilterValue("pages:")).toBeUndefined();
		expect(parseRelationFilterValue("7.5")).toBeUndefined();
		expect(parseRelationFilterValue(undefined)).toBeUndefined();
	});
});
