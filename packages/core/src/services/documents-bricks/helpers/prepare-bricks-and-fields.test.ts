import { expect, test, describe } from "vitest";
import CollectionBuilder from "../../../libs/builders/collection-builder/index.js";
import BrickBuilder from "../../../libs/builders/brick-builder/index.js";
import prepareBricksAndFields from "./prepare-bricks-and-fields.js";
import type { FieldInputSchema } from "../../../types.js";
import type { BrickInputSchema } from "../../../schemas/collection-bricks.js";

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
			name: "Simple",
			singularName: "Simple",
		},
		bricks: {
			builder: [simpleBrick],
		},
	}).addText("simpleHeading", {
		details: {
			label: "Heading Default",
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
});
