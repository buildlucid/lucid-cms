import { expect, test, describe, beforeEach } from "vitest";
import CollectionBuilder from "../../../libs/builders/collection-builder/index.js";
import BrickBuilder from "../../../libs/builders/brick-builder/index.js";
import aggregateBrickTables from "./aggregate-brick-tables.js";
import type { FieldSchemaType } from "../../../types.js";
import type { BrickSchema } from "../../../schemas/collection-bricks.js";

const TEST_CONFIG = {
	localisation: {
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
				useDrafts: true,
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
			collection: {
				column: true,
				filterable: true,
			},
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
					id: "ref-1",
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
									id: "ref-group11",
									open: false,
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
													id: "ref-11",
													open: false,
													fields: [
														{
															key: "nestedItemTitle",
															type: "text",
															translations: { en: "Nested Title One One" },
														},
													],
												},
												{
													id: "ref-12",
													open: false,
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
									id: "ref-group12",
									open: true,
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
													id: "ref-21",
													open: false,
													fields: [
														{
															key: "nestedItemTitle",
															type: "text",
															translations: { en: "Nested Title Two One" },
														},
													],
												},
												{
													id: "ref-22",
													open: false,
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
			bricks?: Array<BrickSchema>;
			fields?: Array<FieldSchemaType>;
		};

		const brickTables = aggregateBrickTables({
			collection: simpleCollection,
			documentId: TEST_CONFIG.documentId,
			versionId: TEST_CONFIG.versionId,
			localisation: TEST_CONFIG.localisation,
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
		expect(itemsTable.priority).toBe(0);
		expect(nestedItemsTable.priority).toBe(1);

		// test field data
		expect(fieldsTable.data).toHaveLength(2); // one per locale

		const enField = fieldsTable.data.find((item) => item._locale === "en");
		const frField = fieldsTable.data.find((item) => item._locale === "fr");

		expect(enField?.simpleHeading).toBe("Homepage");
		expect(frField?.simpleHeading).toBe("Homepage FR");

		// test simple brick data
		expect(simpleBrickTable.data).toHaveLength(2); // one per locale

		const enSimpleBrick = simpleBrickTable.data.find(
			(item) => item._locale === "en",
		);
		const frSimpleBrick = simpleBrickTable.data.find(
			(item) => item._locale === "fr",
		);

		expect(enSimpleBrick?.heading).toBe("I am the heading");
		expect(frSimpleBrick?.heading).toBeNull();

		// test items repeater data
		expect(itemsTable.data).toHaveLength(4); // 2 items × 2 locales

		// get parent references for further testing
		const firstItemEn = itemsTable.data.find(
			(item) => item._locale === "en" && item._position === 0,
		);
		const secondItemEn = itemsTable.data.find(
			(item) => item._locale === "en" && item._position === 1,
		);

		expect(firstItemEn).toBeDefined();
		expect(secondItemEn).toBeDefined();

		const firstItemParentRef = firstItemEn?._parent_id_ref;
		const secondItemParentRef = secondItemEn?._parent_id_ref;

		expect(firstItemParentRef).not.toBe(secondItemParentRef);

		// tst first item data
		expect(firstItemEn?._parent_id).toBeNull();
		expect(firstItemEn?._is_open).toBe(false);
		expect(firstItemEn?.itemTitle).toBe("Title One");

		// test second item data
		expect(secondItemEn?._parent_id).toBeNull();
		expect(secondItemEn?._is_open).toBe(true);
		expect(secondItemEn?.itemTitle).toBe("Title Two");

		// test nested items
		expect(nestedItemsTable.data).toHaveLength(8); // 4 nested items × 2 locales

		// group nested items by parent
		const nestedItemsUnderFirst = nestedItemsTable.data.filter(
			(item) => item._parent_id === firstItemParentRef,
		);
		const nestedItemsUnderSecond = nestedItemsTable.data.filter(
			(item) => item._parent_id === secondItemParentRef,
		);

		expect(nestedItemsUnderFirst).toHaveLength(4); // 2 nested items × 2 locales
		expect(nestedItemsUnderSecond).toHaveLength(4); // 2 nested items × 2 locales

		// test nested items under first parent
		const firstNestedItemEn = nestedItemsUnderFirst.find(
			(item) => item._locale === "en" && item._position === 0,
		);
		const secondNestedItemEn = nestedItemsUnderFirst.find(
			(item) => item._locale === "en" && item._position === 1,
		);

		expect(firstNestedItemEn?.nestedItemTitle).toBe("Nested Title One One");
		expect(secondNestedItemEn?.nestedItemTitle).toBe("Nested Title One Two");

		// test nested items under second parent
		const firstNestedSecondParentEn = nestedItemsUnderSecond.find(
			(item) => item._locale === "en" && item._position === 0,
		);
		const secondNestedSecondParentEn = nestedItemsUnderSecond.find(
			(item) => item._locale === "en" && item._position === 1,
		);

		expect(firstNestedSecondParentEn?.nestedItemTitle).toBe(
			"Nested Title Two One",
		);
		expect(secondNestedSecondParentEn?.nestedItemTitle).toBe(
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
				useDrafts: true,
				useRevisions: true,
			},
			bricks: {
				builder: [deepBrick],
			},
		});

		const deepInputData = {
			bricks: [
				{
					id: "brick1",
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
									id: "l1-1",
									open: true,
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
													id: "l2-1",
													open: true,
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
																	id: "l3-1",
																	open: false,
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
			bricks: Array<BrickSchema>;
		};

		const brickTables = aggregateBrickTables({
			collection: deepCollection,
			documentId: TEST_CONFIG.documentId,
			versionId: TEST_CONFIG.versionId,
			localisation: TEST_CONFIG.localisation,
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
		expect(level1Table.priority).toBe(0);
		expect(level2Table.priority).toBe(1);
		expect(level3Table.priority).toBe(2);

		// test parent/child relatio
		const level1Item = level1Table.data.find((item) => item._locale === "en");
		expect(level1Item).toBeDefined();
		const level1Ref = level1Item?._parent_id_ref;

		const level2Item = level2Table.data.find((item) => item._locale === "en");
		expect(level2Item).toBeDefined();
		expect(level2Item?._parent_id).toBe(level1Ref);
		const level2Ref = level2Item?._parent_id_ref;

		const level3Item = level3Table.data.find((item) => item._locale === "en");
		expect(level3Item).toBeDefined();
		expect(level3Item?._parent_id).toBe(level2Ref);

		// test field values
		expect(level1Item?.level1Title).toBe("Level 1 Item");
		expect(level2Item?.level2Title).toBe("Level 2 Item");
		expect(level3Item?.level3Title).toBe("Level 3 Item");

		// test open state propagation
		expect(level1Item?._is_open).toBe(true);
		expect(level2Item?._is_open).toBe(true);
		expect(level3Item?._is_open).toBe(false);
	});
});
