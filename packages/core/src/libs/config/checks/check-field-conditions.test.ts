import { describe, expect, test } from "vitest";
import CustomFieldSchema from "../../collection/custom-fields/schema.js";
import type { FieldConditionConfig } from "../../collection/custom-fields/types.js";
import defineBrick from "../../collection/define-brick.js";
import defineCollection from "../../collection/define-collection.js";
import field from "../../collection/definitions/fields/field.js";
import { copy } from "../../i18n/index.js";
import checkFieldConditions from "./check-field-conditions.js";

const buildCollection = () =>
	defineCollection({
		key: "pages",
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
	});

const showWhen = (field: string, value: string): FieldConditionConfig => ({
	all: [{ field, operator: "equals", value }],
});

describe("checkFieldConditions", () => {
	test("sibling and ancestor references are valid", () => {
		const collection = buildCollection().insertFields([
			field.select("menuType"),
			field.text("headline", {
				ui: { condition: showWhen("menuType", "docs") },
			}),
			field.repeater("items", {
				fields: [
					field.select("itemType"),
					field.text("label", {
						//* sibling within the same repeater scope
						ui: { condition: showWhen("itemType", "text") },
					}),
					field.repeater("nested", {
						fields: [
							field.text("nestedLabel", {
								//* ancestor scopes: parent repeater and root
								ui: {
									condition: {
										all: [
											{ field: "itemType", operator: "equals", value: "text" },
											{ field: "menuType", operator: "equals", value: "docs" },
										],
									},
								},
							}),
						],
					}),
				],
			}),
		]);

		expect(() =>
			checkFieldConditions("collection", collection.key, collection),
		).not.toThrow();
	});

	test("repeater conditions can reference root fields", () => {
		const collection = buildCollection().insertFields([
			field.select("menuType"),
			field.repeater("items", {
				ui: { condition: showWhen("menuType", "docs") },
				fields: [field.text("label")],
			}),
		]);

		expect(() =>
			checkFieldConditions("collection", collection.key, collection),
		).not.toThrow();
	});

	test("unknown targets throw", () => {
		const collection = buildCollection().insertFields([
			field.text("headline", {
				ui: { condition: showWhen("missingField", "docs") },
			}),
		]);

		expect(() =>
			checkFieldConditions("collection", collection.key, collection),
		).toThrow(/does not exist/);
	});

	test("self references throw", () => {
		const collection = buildCollection().insertFields([
			field.text("headline", {
				ui: { condition: showWhen("headline", "docs") },
			}),
		]);

		expect(() =>
			checkFieldConditions("collection", collection.key, collection),
		).toThrow(/cannot reference itself/);
	});

	test("repeater targets throw", () => {
		const collection = buildCollection().insertFields([
			field.repeater("items", { fields: [field.text("label")] }),
			field.text("headline", {
				ui: {
					condition: {
						all: [{ field: "items", operator: "isNotEmpty" }],
					},
				},
			}),
		]);

		expect(() =>
			checkFieldConditions("collection", collection.key, collection),
		).toThrow(/cannot be used as a condition target/);
	});

	test("descendant references throw", () => {
		const collection = buildCollection().insertFields([
			field.text("headline", {
				//* root fields cannot depend on repeater-scoped fields
				ui: { condition: showWhen("itemType", "text") },
			}),
			field.repeater("items", { fields: [field.select("itemType")] }),
		]);

		expect(() =>
			checkFieldConditions("collection", collection.key, collection),
		).toThrow(/not a direct sibling or ancestor-scope field/);
	});

	test("cousin scope references throw", () => {
		const collection = buildCollection().insertFields([
			field.repeater("linkItems", { fields: [field.select("linkType")] }),
			field.repeater("menuItems", {
				fields: [
					field.text("label", {
						ui: { condition: showWhen("linkType", "document") },
					}),
				],
			}),
		]);

		expect(() =>
			checkFieldConditions("collection", collection.key, collection),
		).toThrow(/not a direct sibling or ancestor-scope field/);
	});

	test("brick trees are checked independently", () => {
		const brick = defineBrick({
			key: "navItem",
			fields: [
				field.select("linkType"),
				field.repeater("items", {
					fields: [
						field.text("label"),
						field.relation("document", {
							collection: "pages",
							ui: { condition: showWhen("linkType", "document") },
						}),
					],
				}),
			],
		});

		expect(() => checkFieldConditions("brick", brick.key, brick)).not.toThrow();

		//* a brick field cannot depend on a collection field key
		const invalidBrick = defineBrick({
			key: "hero",
			fields: [
				field.text("title", {
					ui: { condition: showWhen("menuType", "docs") },
				}),
			],
		});

		expect(() =>
			checkFieldConditions("brick", invalidBrick.key, invalidBrick),
		).toThrow(/does not exist/);
	});

	test("tab conditions resolve against root fields", () => {
		const brick = defineBrick({
			key: "hero",
			fields: [
				field.select("layout"),
				field.tab("advancedTab", {
					ui: { condition: showWhen("layout", "advanced") },
					fields: [field.text("advancedTitle")],
				}),
			],
		});

		expect(() => checkFieldConditions("brick", brick.key, brick)).not.toThrow();
	});
});

describe("condition config schema", () => {
	test("valid conditions parse", async () => {
		const collection = buildCollection().insertFields([
			field.select("menuType"),
			field.text("headline", {
				ui: {
					condition: {
						action: "hide",
						translationScope: "any",
						any: [
							{
								all: [{ field: "menuType", operator: "equals", value: "docs" }],
							},
							{ all: [{ field: "menuType", operator: "isEmpty" }] },
						],
					},
				},
			}),
		]);

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
					all: [{ field: "menuType", operator: "greaterThan", value: "docs" }],
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
					all: [{ field: "menuType", operator: "equals" }],
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
					all: [{ field: "menuType", operator: "equals", value: "docs" }],
				},
			},
		});
		expect(res.success).toBe(false);
	});
});
