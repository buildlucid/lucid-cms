import { expect, test, describe } from "vitest";
import CollectionBuilder from "../../../libs/builders/collection-builder/index.js";
import BrickBuilder from "../../../libs/builders/brick-builder/index.js";
import aggregateBrickTables from "./aggregate-brick-tables.js";
import type { FieldInputSchema } from "../../../types.js";
import type { BrickInputSchema } from "../../../schemas/collection-bricks.js";

const TEST_CONFIG = {
	localization: {
		locales: [
			{ label: "English", code: "en" },
			{ label: "French", code: "fr" },
		],
		defaultLocale: "en",
	},
	documentId: 39,
	versionId: 39,
};

describe("brick table construction", () => {
	test("should correctly generate tables for two level nested repeaters", () => {
		const simpleBrick = new BrickBuilder("simple")
			.addText("heading", { config: { useTranslations: false } })
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
			config: {
				useTranslations: true,
				useRevisions: true,
			},
			bricks: {
				builder: [simpleBrick],
			},
		}).addText("simpleHeading", {
			details: {
				label: { en: "Heading Default" },
			},
			validation: { required: true },
			displayInListing: true,
		});

		const simpleInputData = {
			fields: [
				{
					key: "simpleHeading",
					type: "text",
					translations: {
						en: "Homepage",
						fr: "Homepage FR",
					},
				},
			],
			bricks: [
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
							key: "items",
							type: "repeater",
							groups: [
								{
									ref: "ref-group11",
									open: false,
									order: 0,
									fields: [
										{
											key: "itemTitle",
											type: "text",
											translations: { en: "Title One" },
										},
										{
											key: "nestedItems",
											type: "repeater",
											groups: [
												{
													ref: "ref-11",
													open: false,
													order: 0,
													fields: [
														{
															key: "nestedItemTitle",
															type: "text",
															translations: { en: "Nested Title One One" },
														},
													],
												},
												{
													ref: "ref-12",
													open: false,
													order: 1,
													fields: [
														{
															key: "nestedItemTitle",
															type: "text",
															translations: { en: "Nested Title One Two" },
														},
													],
												},
											],
										},
									],
								},
								{
									ref: "ref-group12",
									open: true,
									order: 1,
									fields: [
										{
											key: "itemTitle",
											type: "text",
											translations: { en: "Title Two" },
										},
										{
											key: "nestedItems",
											type: "repeater",
											groups: [
												{
													ref: "ref-21",
													open: false,
													order: 0,
													fields: [
														{
															key: "nestedItemTitle",
															type: "text",
															translations: { en: "Nested Title Two One" },
														},
													],
												},
												{
													ref: "ref-22",
													open: false,
													order: 1,
													fields: [
														{
															key: "nestedItemTitle",
															type: "text",
															translations: { en: "Nested Title Two Two" },
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
			],
		} satisfies {
			bricks?: Array<BrickInputSchema>;
			fields?: Array<FieldInputSchema>;
		};

		const brickTables = aggregateBrickTables({
			collection: simpleCollection,
			documentId: TEST_CONFIG.documentId,
			versionId: TEST_CONFIG.versionId,
			localization: TEST_CONFIG.localization,
			bricks: simpleInputData.bricks,
			fields: simpleInputData.fields,
		});
		brickTables.sort((a, b) => a.priority - b.priority);

		// test table structure
		expect(brickTables).toHaveLength(4);

		const [fieldsTable, simpleBrickTable, itemsTable, nestedItemsTable] =
			brickTables;

		// verify table names
		expect(fieldsTable.table).toBe("lucid_document__simple__fields");
		expect(simpleBrickTable.table).toBe("lucid_document__simple__simple");
		expect(itemsTable.table).toBe("lucid_document__simple__simple__items");
		expect(nestedItemsTable.table).toBe(
			"lucid_document__simple__simple__items__nestedItems",
		);

		// verify priorities
		expect(fieldsTable.priority).toBe(0);
		expect(simpleBrickTable.priority).toBe(0);
		expect(itemsTable.priority).toBe(1);
		expect(nestedItemsTable.priority).toBe(2);

		// test field data
		expect(fieldsTable.data).toHaveLength(2); // one per locale

		const enField = fieldsTable.data.find((item) => item.locale === "en");
		const frField = fieldsTable.data.find((item) => item.locale === "fr");

		expect(enField?._simpleHeading).toBe("Homepage");
		expect(frField?._simpleHeading).toBe("Homepage FR");

		// test simple brick data
		expect(simpleBrickTable.data).toHaveLength(2); // one per locale

		const enSimpleBrick = simpleBrickTable.data.find(
			(item) => item.locale === "en",
		);
		const frSimpleBrick = simpleBrickTable.data.find(
			(item) => item.locale === "fr",
		);

		expect(enSimpleBrick?._heading).toBe("I am the heading");
		expect(frSimpleBrick?._heading).toBeNull();

		// test items repeater data
		expect(itemsTable.data).toHaveLength(4); // 2 items × 2 locales

		// get parent references for further testing
		const firstItemEn = itemsTable.data.find(
			(item) => item.locale === "en" && item.position === 0,
		);
		const secondItemEn = itemsTable.data.find(
			(item) => item.locale === "en" && item.position === 1,
		);

		expect(firstItemEn).toBeDefined();
		expect(secondItemEn).toBeDefined();

		const firstItemParentRef = firstItemEn?.parent_id_ref;
		const secondItemParentRef = secondItemEn?.parent_id_ref;

		expect(firstItemParentRef).not.toBe(secondItemParentRef);

		// tst first item data
		expect(firstItemEn?.parent_id).toBeNull();
		expect(firstItemEn?.is_open).toBe(false);
		expect(firstItemEn?._itemTitle).toBe("Title One");

		// test second item data
		expect(secondItemEn?.parent_id).toBeNull();
		expect(secondItemEn?.is_open).toBe(true);
		expect(secondItemEn?._itemTitle).toBe("Title Two");

		// test nested items
		expect(nestedItemsTable.data).toHaveLength(8); // 4 nested items × 2 locales

		// group nested items by parent
		const nestedItemsUnderFirst = nestedItemsTable.data.filter(
			(item) => item.parent_id === firstItemParentRef,
		);
		const nestedItemsUnderSecond = nestedItemsTable.data.filter(
			(item) => item.parent_id === secondItemParentRef,
		);

		//* parent ids are localised
		expect(nestedItemsUnderFirst).toHaveLength(2); // 2 nested items × 1 locales
		expect(nestedItemsUnderSecond).toHaveLength(2); // 2 nested items × 1 locales

		// test nested items under first parent
		const firstNestedItemEn = nestedItemsUnderFirst.find(
			(item) => item.locale === "en" && item.position === 0,
		);
		const secondNestedItemEn = nestedItemsUnderFirst.find(
			(item) => item.locale === "en" && item.position === 1,
		);

		expect(firstNestedItemEn?._nestedItemTitle).toBe("Nested Title One One");
		expect(secondNestedItemEn?._nestedItemTitle).toBe("Nested Title One Two");

		// test nested items under second parent
		const firstNestedSecondParentEn = nestedItemsUnderSecond.find(
			(item) => item.locale === "en" && item.position === 0,
		);
		const secondNestedSecondParentEn = nestedItemsUnderSecond.find(
			(item) => item.locale === "en" && item.position === 1,
		);

		expect(firstNestedSecondParentEn?._nestedItemTitle).toBe(
			"Nested Title Two One",
		);
		expect(secondNestedSecondParentEn?._nestedItemTitle).toBe(
			"Nested Title Two Two",
		);
	});

	test("should handle three-level nested repeaters with correct priorities", () => {
		const deepBrick = new BrickBuilder("deep")
			.addRepeater("level1")
			.addText("level1Title")
			.addRepeater("level2")
			.addText("level2Title")
			.addRepeater("level3")
			.addText("level3Title")
			.endRepeater()
			.endRepeater()
			.endRepeater();

		const deepCollection = new CollectionBuilder("deep", {
			mode: "multiple",
			details: {
				name: "Deep",
				singularName: "Deep",
			},
			config: {
				useTranslations: true,
				useRevisions: true,
			},
			bricks: {
				builder: [deepBrick],
			},
		});

		const deepInputData = {
			bricks: [
				{
					ref: "brick1",
					key: "deep",
					order: 0,
					type: "builder",
					open: true,
					fields: [
						{
							key: "level1",
							type: "repeater",
							groups: [
								{
									ref: "l1-1",
									open: true,
									order: 0,
									fields: [
										{
											key: "level1Title",
											type: "text",
											translations: { en: "Level 1 Item" },
										},
										{
											key: "level2",
											type: "repeater",
											groups: [
												{
													ref: "l2-1",
													open: true,
													order: 0,
													fields: [
														{
															key: "level2Title",
															type: "text",
															translations: { en: "Level 2 Item" },
														},
														{
															key: "level3",
															type: "repeater",
															groups: [
																{
																	ref: "l3-1",
																	open: false,
																	order: 0,
																	fields: [
																		{
																			key: "level3Title",
																			type: "text",
																			translations: { en: "Level 3 Item" },
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
							],
						},
					],
				},
			],
		} satisfies {
			bricks: Array<BrickInputSchema>;
		};

		const brickTables = aggregateBrickTables({
			collection: deepCollection,
			documentId: TEST_CONFIG.documentId,
			versionId: TEST_CONFIG.versionId,
			localization: TEST_CONFIG.localization,
			bricks: deepInputData.bricks,
			fields: [],
		});
		brickTables.sort((a, b) => a.priority - b.priority);

		// test table structure
		expect(brickTables).toHaveLength(4);

		const [rootTable, level1Table, level2Table, level3Table] = brickTables;

		// verify table names
		expect(rootTable.table).toBe("lucid_document__deep__deep");
		expect(level1Table.table).toBe("lucid_document__deep__deep__level1");
		expect(level2Table.table).toBe(
			"lucid_document__deep__deep__level1__level2",
		);
		expect(level3Table.table).toBe(
			"lucid_document__deep__deep__level1__level2__level3",
		);

		// verify priorities
		expect(rootTable.priority).toBe(0);
		expect(level1Table.priority).toBe(1);
		expect(level2Table.priority).toBe(2);
		expect(level3Table.priority).toBe(3);

		// test parent/child relatio
		const level1Item = level1Table.data.find((item) => item.locale === "en");
		expect(level1Item).toBeDefined();
		const level1Ref = level1Item?.parent_id_ref;

		const level2Item = level2Table.data.find((item) => item.locale === "en");
		expect(level2Item).toBeDefined();
		expect(level2Item?.parent_id).toBe(level1Ref);
		const level2Ref = level2Item?.parent_id_ref;

		const level3Item = level3Table.data.find((item) => item.locale === "en");
		expect(level3Item).toBeDefined();
		expect(level3Item?.parent_id).toBe(level2Ref);

		// test field values
		expect(level1Item?._level1Title).toBe("Level 1 Item");
		expect(level2Item?._level2Title).toBe("Level 2 Item");
		expect(level3Item?._level3Title).toBe("Level 3 Item");

		// test open state propagation
		expect(level1Item?.is_open).toBe(true);
		expect(level2Item?.is_open).toBe(true);
		expect(level3Item?.is_open).toBe(false);
	});
});
