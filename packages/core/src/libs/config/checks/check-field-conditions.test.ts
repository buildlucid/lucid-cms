import { describe, expect, test } from "vitest";
import BrickBuilder from "../../collection/builders/brick-builder/index.js";
import CollectionBuilder from "../../collection/builders/collection-builder/index.js";
import CustomFieldSchema from "../../collection/custom-fields/schema.js";
import type { FieldConditionConfig } from "../../collection/custom-fields/types.js";
import { copy } from "../../i18n/index.js";
import checkFieldConditions from "./check-field-conditions.js";

const buildCollection = () =>
	new CollectionBuilder("pages", {
		mode: "multiple",
		details: {
			name: copy("admin:tests.collections.pages.name", {
				defaultMessage: "Pages",
			}),
			singularName: copy("admin:tests.collections.pages.singularName", {
				defaultMessage: "Page",
			}),
		},
	});

const showWhen = (field: string, value: string): FieldConditionConfig => ({
	groups: [[{ field, operator: "equals", value }]],
});

describe("checkFieldConditions", () => {
	test("sibling and ancestor references are valid", () => {
		const collection = buildCollection()
			.addSelect("menuType")
			.addText("headline", {
				ui: { condition: showWhen("menuType", "docs") },
			})
			.addRepeater("items")
			.addSelect("itemType")
			.addText("label", {
				//* sibling within the same repeater scope
				ui: { condition: showWhen("itemType", "text") },
			})
			.addRepeater("nested")
			.addText("nestedLabel", {
				//* ancestor scopes: parent repeater and root
				ui: {
					condition: {
						groups: [
							[
								{ field: "itemType", operator: "equals", value: "text" },
								{ field: "menuType", operator: "equals", value: "docs" },
							],
						],
					},
				},
			})
			.endRepeater()
			.endRepeater();

		expect(() =>
			checkFieldConditions("collection", collection.key, collection),
		).not.toThrow();
	});

	test("repeater conditions can reference root fields", () => {
		const collection = buildCollection()
			.addSelect("menuType")
			.addRepeater("items", {
				ui: { condition: showWhen("menuType", "docs") },
			})
			.addText("label")
			.endRepeater();

		expect(() =>
			checkFieldConditions("collection", collection.key, collection),
		).not.toThrow();
	});

	test("unknown targets throw", () => {
		const collection = buildCollection().addText("headline", {
			ui: { condition: showWhen("missingField", "docs") },
		});

		expect(() =>
			checkFieldConditions("collection", collection.key, collection),
		).toThrow(/does not exist/);
	});

	test("self references throw", () => {
		const collection = buildCollection().addText("headline", {
			ui: { condition: showWhen("headline", "docs") },
		});

		expect(() =>
			checkFieldConditions("collection", collection.key, collection),
		).toThrow(/cannot reference itself/);
	});

	test("repeater targets throw", () => {
		const collection = buildCollection()
			.addRepeater("items")
			.addText("label")
			.endRepeater()
			.addText("headline", {
				ui: {
					condition: {
						groups: [[{ field: "items", operator: "isNotEmpty" }]],
					},
				},
			});

		expect(() =>
			checkFieldConditions("collection", collection.key, collection),
		).toThrow(/cannot be used as a condition target/);
	});

	test("descendant references throw", () => {
		const collection = buildCollection()
			.addText("headline", {
				//* root fields cannot depend on repeater-scoped fields
				ui: { condition: showWhen("itemType", "text") },
			})
			.addRepeater("items")
			.addSelect("itemType")
			.endRepeater();

		expect(() =>
			checkFieldConditions("collection", collection.key, collection),
		).toThrow(/not a direct sibling or ancestor-scope field/);
	});

	test("cousin scope references throw", () => {
		const collection = buildCollection()
			.addRepeater("linkItems")
			.addSelect("linkType")
			.endRepeater()
			.addRepeater("menuItems")
			.addText("label", {
				ui: { condition: showWhen("linkType", "document") },
			})
			.endRepeater();

		expect(() =>
			checkFieldConditions("collection", collection.key, collection),
		).toThrow(/not a direct sibling or ancestor-scope field/);
	});

	test("brick trees are checked independently", () => {
		const brick = new BrickBuilder("navItem")
			.addSelect("linkType")
			.addRepeater("items")
			.addText("label")
			.addRelation("document", {
				collection: "pages",
				ui: { condition: showWhen("linkType", "document") },
			})
			.endRepeater();

		expect(() => checkFieldConditions("brick", brick.key, brick)).not.toThrow();

		//* a brick field cannot depend on a collection field key
		const invalidBrick = new BrickBuilder("hero").addText("title", {
			ui: { condition: showWhen("menuType", "docs") },
		});

		expect(() =>
			checkFieldConditions("brick", invalidBrick.key, invalidBrick),
		).toThrow(/does not exist/);
	});

	test("tab conditions resolve against root fields", () => {
		const brick = new BrickBuilder("hero")
			.addSelect("layout")
			.addTab("advancedTab", {
				ui: { condition: showWhen("layout", "advanced") },
			})
			.addText("advancedTitle");

		expect(() => checkFieldConditions("brick", brick.key, brick)).not.toThrow();
	});
});

describe("condition config schema", () => {
	test("valid conditions parse", async () => {
		const collection = buildCollection()
			.addSelect("menuType")
			.addText("headline", {
				ui: {
					condition: {
						action: "hide",
						translationScope: "any",
						groups: [
							[{ field: "menuType", operator: "equals", value: "docs" }],
							[{ field: "menuType", operator: "isEmpty" }],
						],
					},
				},
			});

		for (const field of collection.flatFields) {
			const res = await CustomFieldSchema.safeParseAsync(field);
			expect(res.success).toBe(true);
		}
	});

	test("invalid operators fail to parse", async () => {
		const res = await CustomFieldSchema.safeParseAsync({
			key: "headline",
			type: "text",
			ui: {
				condition: {
					groups: [
						[{ field: "menuType", operator: "greaterThan", value: "docs" }],
					],
				},
			},
		});
		expect(res.success).toBe(false);
	});

	test("comparison operators without a value fail to parse", async () => {
		const res = await CustomFieldSchema.safeParseAsync({
			key: "headline",
			type: "text",
			ui: {
				condition: {
					groups: [[{ field: "menuType", operator: "equals" }]],
				},
			},
		});
		expect(res.success).toBe(false);
	});

	test("invalid translation scopes fail to parse", async () => {
		const res = await CustomFieldSchema.safeParseAsync({
			key: "headline",
			type: "text",
			ui: {
				condition: {
					translationScope: "all",
					groups: [[{ field: "menuType", operator: "equals", value: "docs" }]],
				},
			},
		});
		expect(res.success).toBe(false);
	});
});
