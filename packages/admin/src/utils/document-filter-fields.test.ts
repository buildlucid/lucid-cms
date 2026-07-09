import type { Collection, ResolvedAdminCopy } from "@types";
import { describe, expect, it } from "vitest";
import {
	buildDocumentFilterSchema,
	documentFilterFields,
	operatorsForFieldType,
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
			]),
		);

		expect(fields).toEqual([
			{ key: "_title", label: "Title", type: "text" },
			{ key: "_amount", label: "amount", type: "number" },
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

	it("traverses structural containers without including their labels", () => {
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
					],
				},
			]),
		);

		expect(fields).toEqual([
			{ key: "_metaTitle", label: "Meta title", type: "text" },
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

		//* repeater labels stay out of the display name
		expect(fields).toEqual([
			{ key: "fields.people._name", label: "Name", type: "text" },
			{
				key: "hero.items._itemTitle",
				label: "Hero > Item title",
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
			{ key: "fields.inner._note", label: "note", type: "text" },
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
});

describe("operatorsForFieldType", () => {
	it("uses backend operator tokens per field type", () => {
		expect(operatorsForFieldType("text")).toEqual([
			"=",
			"!=",
			"like",
			"not like",
		]);
		expect(operatorsForFieldType("number")).toEqual([
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
		]);

		expect(schema._title?.type).toBe("text");
		expect(schema._featured?.type).toBe("boolean");
		expect(schema._author?.type).toBe("number");
	});
});
