import { describe, expect, test } from "vitest";
import BrickBuilder from "../../../libs/collection/builders/brick-builder/index.js";
import CollectionBuilder from "../../../libs/collection/builders/collection-builder/index.js";
import { copy } from "../../../libs/i18n/index.js";
import type { BrickInputSchema } from "../../../schemas/collection-bricks.js";
import type { FieldInputSchema } from "../../../types.js";
import prepareBricksAndFields, {
	analyzeEmbeddedBrickGraph,
} from "./prepare-bricks-and-fields.js";

describe("testing prepareBricksAndFields", () => {
	// Mock localization config to pass to the functions
	const mockLocalization = {
		locales: [
			{
				label: "English",
				code: "en",
			},
			{
				label: "French",
				code: "fr",
			},
		],
		defaultLocale: "en",
	};

	const simpleBrick = new BrickBuilder("simple")
		.addText("heading")
		.addRepeater("items")
		.addText("itemTitle")
		.addRepeater("nestedItems")
		.addText("nestedItemTitle")
		.endRepeater()
		.endRepeater();

	const simpleCollection = new CollectionBuilder("simple", {
		mode: "multiple",
		details: {
			name: copy("admin:tests.collections.simple.name", {
				defaultMessage: "Simple",
			}),
			singularName: copy("admin:tests.collections.simple.singularName", {
				defaultMessage: "Simple",
			}),
		},
		bricks: {
			builder: [simpleBrick],
		},
	}).addText("simpleHeading", {
		details: {
			label: copy("admin:tests.fields.simpleHeading.label", {
				defaultMessage: "Heading Default",
			}),
		},
	});

	test("should filter out fields that don't exist in the collection", () => {
		const fields: Array<FieldInputSchema> = [
			{
				key: "simpleHeading",
				type: "text",
				translations: {
					en: "Homepage",
				},
			},
			{
				key: "nonExistentField",
				type: "text",
				value: "This should be filtered out",
			},
		];

		const { preparedFields } = prepareBricksAndFields({
			collection: simpleCollection,
			fields,
			localization: mockLocalization,
		});

		expect(preparedFields).toHaveLength(1);
		expect(preparedFields?.[0].key).toBe("simpleHeading");
		expect(
			preparedFields?.find((f) => f.key === "nonExistentField"),
		).toBeUndefined();
	});

	test("should process brick fields and nested repeaters correctly", () => {
		const bricks: Array<BrickInputSchema> = [
			{
				ref: "ref-1",
				key: "simple",
				order: 0,
				type: "builder",
				open: true,
				fields: [
					{
						key: "heading",
						type: "text",
						value: "I am the heading",
					},
					{
						key: "nonExistentBrickField",
						type: "text",
						value: "This should be filtered out",
					},
					{
						key: "items",
						type: "repeater",
						groups: [
							{
								ref: "ref-group1",
								open: false,
								order: 0,
								fields: [
									{
										key: "itemTitle",
										type: "text",
										translations: { en: "Item Title" },
									},
									{
										key: "nestedItems",
										type: "repeater",
										groups: [
											{
												ref: "ref-nested1",
												open: false,
												order: 0,
												fields: [
													{
														key: "nestedItemTitle",
														type: "text",
														translations: { en: "Nested Item Title" },
													},
													{
														key: "nonExistentNestedField",
														type: "text",
														value: "This should be filtered out",
													},
												],
											},
										],
									},
								],
							},
						],
					},
				],
			},
		];

		const { preparedBricks } = prepareBricksAndFields({
			collection: simpleCollection,
			bricks,
			localization: mockLocalization,
		});

		expect(preparedBricks).toHaveLength(1);

		// check top-level fields are filtered correctly
		const processedBrick = preparedBricks?.[0];
		expect(processedBrick?.fields).toHaveLength(2); // heading and items
		expect(
			processedBrick?.fields?.find((f) => f.key === "heading"),
		).toBeDefined();
		expect(
			processedBrick?.fields?.find((f) => f.key === "nonExistentBrickField"),
		).toBeUndefined();

		// check the repeater field
		const itemsField = processedBrick?.fields?.find((f) => f.key === "items");
		expect(itemsField?.type).toBe("repeater");
		expect(itemsField?.groups).toHaveLength(1);

		// check nested repeater
		const firstGroup = itemsField?.groups?.[0];
		expect(firstGroup?.fields).toHaveLength(2); // itemTitle and nestedItems

		const nestedItemsField = firstGroup?.fields.find(
			(f) => f.key === "nestedItems",
		);
		expect(nestedItemsField?.type).toBe("repeater");

		// check deeply nested fields are filtered correctly
		const nestedGroup = nestedItemsField?.groups?.[0];
		expect(nestedGroup?.fields).toHaveLength(1); // only nestedItemTitle
		expect(
			nestedGroup?.fields.find((f) => f.key === "nestedItemTitle"),
		).toBeDefined();
		expect(
			nestedGroup?.fields.find((f) => f.key === "nonExistentNestedField"),
		).toBeUndefined();
	});

	test("should handle empty inputs gracefully", () => {
		const result = prepareBricksAndFields({
			collection: simpleCollection,
			localization: mockLocalization,
		});

		expect(result.preparedBricks).toBeUndefined();
		expect(result.preparedFields).toBeUndefined();
	});

	test("should keep only embedded bricks reachable from rich text", () => {
		const cardBrick = new BrickBuilder("card").addText("title");
		const collection = new CollectionBuilder("rich-content", {
			mode: "multiple",
			details: {
				name: copy("admin:tests.collections.rich-content.name", {
					defaultMessage: "Rich Content",
				}),
				singularName: copy(
					"admin:tests.collections.rich-content.singularName",
					{ defaultMessage: "Rich Content" },
				),
			},
			bricks: { embedded: [cardBrick] },
		}).addRichText("body");
		const richTextValue = {
			type: "doc",
			content: [
				{
					type: "lucidEmbeddedBrick",
					attrs: { ref: "used-card" },
				},
			],
		};

		const { preparedBricks } = prepareBricksAndFields({
			collection,
			localization: mockLocalization,
			fields: [{ key: "body", type: "rich-text", value: richTextValue }],
			bricks: [
				{
					ref: "used-card",
					key: "card",
					order: 0,
					type: "embedded",
					fields: [{ key: "title", type: "text", value: "Used" }],
				},
				{
					ref: "orphan-card",
					key: "card",
					order: 0,
					type: "embedded",
					fields: [{ key: "title", type: "text", value: "Orphan" }],
				},
			],
		});

		expect(preparedBricks?.map((brick) => brick.ref)).toEqual(["used-card"]);
	});

	test("should find reachable nested bricks and embedded reference cycles", () => {
		const richText = (ref: string): FieldInputSchema => ({
			key: "content",
			type: "rich-text",
			value: {
				type: "doc",
				content: [{ type: "lucidEmbeddedBrick", attrs: { ref } }],
			},
		});
		const bricks: BrickInputSchema[] = [
			{
				ref: "card-a",
				key: "card",
				order: 0,
				type: "embedded",
				fields: [richText("card-b")],
			},
			{
				ref: "card-b",
				key: "card",
				order: 0,
				type: "embedded",
				fields: [richText("card-a")],
			},
			{
				ref: "orphan",
				key: "card",
				order: 0,
				type: "embedded",
				fields: [],
			},
		];

		const result = analyzeEmbeddedBrickGraph({
			fields: [
				{
					key: "body",
					type: "rich-text",
					value: richText("card-a").value,
				},
			],
			bricks,
		});

		expect(Array.from(result.reachable)).toEqual(["card-a", "card-b"]);
		expect(Array.from(result.cyclic)).toEqual(["card-a", "card-b"]);
	});

	test("should trim string custom field values and translations", () => {
		const collection = new CollectionBuilder("trim-test", {
			mode: "single",
			details: {
				name: copy("admin:tests.collections.trim-test.name", {
					defaultMessage: "Trim Test",
				}),
				singularName: copy("admin:tests.collections.trim-test.singularName", {
					defaultMessage: "Trim Test",
				}),
			},
			localized: true,
		})
			.addText("title")
			.addSelect("status", {
				options: [
					{
						label: copy("admin:tests.fields.status.options.draft", {
							defaultMessage: "Draft",
						}),
						value: "draft",
					},
					{
						label: copy("admin:tests.fields.status.options.live", {
							defaultMessage: "Live",
						}),
						value: "live",
					},
				],
			})
			.addLink("cta");

		const fields: Array<FieldInputSchema> = [
			{
				key: "title",
				type: "text",
				translations: {
					en: "  Hello  ",
				},
			},
			{
				key: "status",
				type: "select",
				value: "  draft  ",
			},
			{
				key: "cta",
				type: "link",
				value: {
					url: "  https://example.com  ",
					label: "  Learn more  ",
					target: "  _blank  ",
				},
			},
		];

		const { preparedFields } = prepareBricksAndFields({
			collection,
			fields,
			localization: mockLocalization,
		});

		expect(
			preparedFields?.find((f) => f.key === "title")?.translations?.en,
		).toBe("Hello");
		expect(preparedFields?.find((f) => f.key === "status")?.value).toBe(
			"draft",
		);
		expect(preparedFields?.find((f) => f.key === "cta")?.value).toEqual({
			url: "https://example.com",
			label: "Learn more",
			target: "_blank",
		});
	});

	test("should normalize empty json custom field values to null", () => {
		const collection = new CollectionBuilder("json-empty-test", {
			mode: "single",
			details: {
				name: copy("admin:tests.collections.json-empty-test.name", {
					defaultMessage: "JSON Empty Test",
				}),
				singularName: copy(
					"admin:tests.collections.json-empty-test.singularName",
					{
						defaultMessage: "JSON Empty Test",
					},
				),
			},
		}).addJSON("metadata");

		const fields: Array<FieldInputSchema> = [
			{
				key: "metadata",
				type: "json",
				value: "   ",
			},
		];

		const { preparedFields } = prepareBricksAndFields({
			collection,
			fields,
			localization: mockLocalization,
		});

		expect(preparedFields?.find((f) => f.key === "metadata")?.value).toBeNull();
	});

	test("should normalize empty datetime custom field values to null", () => {
		const collection = new CollectionBuilder("datetime-empty-test", {
			mode: "single",
			details: {
				name: copy("admin:tests.collections.datetime-empty-test.name", {
					defaultMessage: "Datetime Empty Test",
				}),
				singularName: copy(
					"admin:tests.collections.datetime-empty-test.singularName",
					{
						defaultMessage: "Datetime Empty Test",
					},
				),
			},
		}).addDateTime("publishDate");

		const fields: Array<FieldInputSchema> = [
			{
				key: "publishDate",
				type: "datetime",
				value: "",
			},
		];

		const { preparedFields } = prepareBricksAndFields({
			collection,
			fields,
			localization: mockLocalization,
		});

		expect(
			preparedFields?.find((f) => f.key === "publishDate")?.value,
		).toBeNull();
	});
});
