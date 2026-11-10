import { describe, expect, expectTypeOf, test, vi } from "vitest";
import { copy } from "../../../i18n/index.js";
import type { FieldOptions } from "../../custom-fields/types.js";
import defineBrick from "../../define-brick.js";
import defineCollection from "../../define-collection.js";
import { isCollectionFieldLocalized } from "../../helpers/resolve-collection-localization.js";
import CollectionDefinition, {
	isCollectionDefinition,
} from "../collection/index.js";
import type { CollectionOptions } from "../collection/types.js";
import field from "./field.js";
import { getFieldSetState } from "./index.js";

const collectionOptions = {
	mode: "multiple",
	details: { labels: { singular: "Article", plural: "Articles" } },
} satisfies CollectionOptions;

describe("builder ownership", () => {
	test("owns field options and returns detached inspection data", () => {
		const label = copy("admin:tests.title", { defaultMessage: "Title" });
		const ui: NonNullable<FieldOptions<"text">["ui"]> = { width: 6 };
		const options = { details: { label }, ui } satisfies FieldOptions<"text">;
		const builder = defineBrick({
			key: "test",
			fields: [field.text("title", options)],
		});
		label.defaultMessage = "Changed input";
		ui.width = 12;
		const snapshot = builder.fields.get("title");
		expect(snapshot?.config.details?.label).toMatchObject({
			defaultMessage: "Title",
		});
		expect(snapshot).not.toHaveProperty("validate");
		if (snapshot?.config.type !== "text" || !snapshot.config.ui)
			throw new Error("Expected text UI options");
		snapshot.config.ui.width = 12;
		const treeField = builder.fieldTree[0];
		if (treeField?.type !== "text" || !treeField.ui)
			throw new Error("Expected text UI options");
		treeField.ui.width = 12;
		expect(builder.fields.get("title")?.config.ui).toMatchObject({ width: 6 });
		expect(builder.fieldTree[0]?.ui).toMatchObject({ width: 6 });
	});

	test("owns collection options, brick arrays and nested copy descriptors", () => {
		const label = copy("admin:tests.hero", { defaultMessage: "Hero" });
		const brick = defineBrick({
			key: "hero",
			details: { label },
			fields: [field.text("title")],
		});
		const options = {
			...collectionOptions,
			details: { labels: { singular: label, plural: "Articles" } },
			bricks: { fixed: [brick, brick] },
			publishing: {
				environments: [{ key: "live", label, requires: ["review"] }],
			},
		} satisfies CollectionOptions;
		const collection = defineCollection({ key: "articles", ...options });
		const clone = collection.clone();
		expect(options.bricks.fixed).toHaveLength(2);
		expect(collection.config.bricks?.fixed).toHaveLength(1);
		label.defaultMessage = "Changed input";
		brick.insertFields([field.text("later")]);
		options.publishing.environments[0]?.requires.push("changed");
		expect(collection.fixedBricks[0]?.fields.map((field) => field.key)).toEqual(
			["title"],
		);
		expect(collection.getData.details.labels.singular).toMatchObject({
			defaultMessage: "Hero",
		});
		expect(brick.config.details.label).toMatchObject({
			defaultMessage: "Hero",
		});
		expect(collection.getData.publishing.environments[0]?.requires).toEqual([
			"review",
		]);
		collection.config.bricks?.fixed?.[0].insertFields([
			field.text("original_only"),
		]);
		collection.config.publishing?.environments?.[0]?.requires?.push(
			"original_only",
		);
		expect(clone.fixedBricks[0]?.fields.map((field) => field.key)).toEqual([
			"title",
		]);
		expect(clone.getData.publishing.environments[0]?.requires).toEqual([
			"review",
		]);
		const data = clone.getData;
		if (data.details.labels.singular.type !== "lucid.copy")
			throw new Error("Expected copy descriptor");
		data.details.labels.singular.defaultMessage = "Changed snapshot";
		expect(clone.getData.details.labels.singular).toMatchObject({
			defaultMessage: "Hero",
		});
	});

	test("clones hold independent fields", () => {
		const original = defineBrick({
			key: "test",
			fields: [field.repeater("items", { fields: [field.text("title")] })],
		});
		const clone = original.clone().insertFields([field.text("clone_only")]);
		original.insertFields([field.text("original_only")]);
		expect(clone.persistedFieldTree).toMatchObject([
			{ key: "items", fields: [{ key: "title" }] },
			{ key: "clone_only" },
		]);
		expect(original.persistedFieldTree).toMatchObject([
			{ key: "items", fields: [{ key: "title" }] },
			{ key: "original_only" },
		]);
	});

	test("preserves collection key inference without putting a key in author options", () => {
		const collection = defineCollection({
			key: "articles",
			...collectionOptions,
		});
		expectTypeOf(collection.key).toEqualTypeOf<"articles">();
		expectTypeOf(collection.config.key).toEqualTypeOf<"articles">();
		expectTypeOf<CollectionOptions>().not.toHaveProperty("key");
	});
});

describe("field composition", () => {
	test("reuses field groups inside nested storage and structural containers", () => {
		const group = [
			field.section("content", { fields: [field.text("title")] }),
			field.repeater("links", { fields: [field.text("url")] }),
		];
		const first = defineBrick({
			key: "first",
			fields: [
				field.repeater("rows", {
					fields: [field.collapsible("panel", { fields: group })],
				}),
			],
		});
		const second = defineBrick({
			key: "second",
			fields: [field.section("wrapper", { fields: group })],
		});
		expect(first.fields.get("content")).toMatchObject({
			treeParent: "rows",
			structuralParent: "panel",
		});
		expect(first.fields.get("title")).toMatchObject({
			treeParent: "rows",
			structuralParent: "content",
		});
		expect(first.fields.get("links")).toMatchObject({
			treeParent: "rows",
			structuralParent: "panel",
		});
		expect(first.fields.get("url")).toMatchObject({
			treeParent: "links",
			structuralParent: null,
		});
		expect(getFieldSetState(first).meta.repeaterDepth).toEqual({
			rows: 0,
			links: 1,
		});
		expect(first.persistedFieldTree).toMatchObject([
			{
				key: "rows",
				fields: [{ key: "title" }, { key: "links", fields: [{ key: "url" }] }],
			},
		]);
		expect(second.fields.get("content")).toMatchObject({
			treeParent: null,
			structuralParent: "wrapper",
		});
		expect(getFieldSetState(second).meta.repeaterDepth).toEqual({
			links: 0,
		});
		expect(getFieldSetState(first).fields.get("title")).not.toBe(
			getFieldSetState(second).fields.get("title"),
		);
	});

	test("rejects duplicate keys before changing fields or collection metadata", () => {
		const collection = defineCollection({
			key: "articles",
			...collectionOptions,
			fields: [field.text("title")],
		});
		const before = collection.fieldTree;
		expect(() =>
			collection.insertFields([field.text("new"), field.text("title")]),
		).toThrow('Field "title" is already registered');
		expect(() =>
			collection.insertFields([
				field.text("title", { showInList: true, useAsLabel: true }),
			]),
		).toThrow("already registered");
		expect(() =>
			collection.insertFields([
				field.repeater("rows", { fields: [field.text("rows")] }),
			]),
		).toThrow("already registered");
		expect(collection.fieldTree).toEqual(before);
		expect(collection.listing).toEqual([]);
		expect(collection.labelFields).toEqual([]);
	});

	test("tracks list and label fields wherever they are inserted", () => {
		const collection = defineCollection({
			key: "articles",
			...collectionOptions,
			fields: [field.text("title", { showInList: true, useAsLabel: true })],
		});
		collection.insertFields(
			[field.checkbox("featured", { showInList: true })],
			{
				before: "title",
			},
		);
		expect(collection.listing).toEqual(["title", "featured"]);
		expect(collection.labelFields).toEqual(["title"]);
	});
});

describe("field placement", () => {
	const build = () =>
		defineBrick({
			key: "test",
			fields: [
				field.text("title"),
				field.repeater("rows", { fields: [field.text("row_title")] }),
				field.tab("routing", {
					fields: [
						field.section("section", { fields: [field.text("nested")] }),
						field.text("slug"),
					],
				}),
			],
		});

	test("places fields beside top-level fields and inside tabs", () => {
		const builder = build();
		const before = builder.fieldTree;
		builder.insertFields([field.text("lead")], { at: "start" });
		builder.insertFields([field.text("summary")], { before: "rows" });
		//* after a container means after the fields inside it
		builder.insertFields([field.text("footer")], { after: "rows" });
		builder.insertFields([field.text("path")], { after: "section" });
		builder.insertFields([field.text("last")]);

		expect(builder.fieldTree).not.toEqual(before);
		expect([...builder.fields.keys()]).toEqual([
			"lead",
			"title",
			"summary",
			"rows",
			"row_title",
			"footer",
			"routing",
			"section",
			"nested",
			"path",
			"slug",
			"last",
		]);
		expect(builder.fields.get("path")).toMatchObject({
			tabParent: "routing",
			treeParent: null,
			structuralParent: null,
		});
		expect(builder.fields.get("footer")).toMatchObject({ tabParent: null });
	});

	test("places whole containers, keeping their children with them", () => {
		const builder = build();
		builder.insertFields(
			[field.repeater("links", { fields: [field.link("link")] })],
			{ before: "slug" },
		);
		expect(builder.fieldTree).toMatchObject([
			{ key: "title" },
			{ key: "rows" },
			{
				key: "routing",
				fields: [
					{ key: "section" },
					{ key: "links", fields: [{ key: "link" }] },
					{ key: "slug" },
				],
			},
		]);
		expect(getFieldSetState(builder).meta.repeaterDepth).toEqual({
			rows: 0,
			links: 0,
		});
	});

	test("rejects unknown and nested anchors without changing fields", () => {
		const builder = build();
		const before = builder.fieldTree;
		expect(() =>
			builder.insertFields([field.text("x")], { after: "missing" }),
		).toThrow('Field "missing" does not exist.');
		for (const key of ["row_title", "nested"]) {
			expect(() =>
				builder.insertFields([field.text("x")], { before: key }),
			).toThrow("top-level or directly in a tab");
		}
		expect(builder.fieldTree).toEqual(before);
	});
});

test("collection identity and field state survive separate loads of core", async () => {
	vi.resetModules();
	const { default: OtherCollectionDefinition } =
		await import("../collection/index.js");
	const foreign = new OtherCollectionDefinition(
		"articles",
		collectionOptions,
	).insertFields([field.text("title")]);
	expect(foreign).not.toBeInstanceOf(CollectionDefinition);
	expect(isCollectionDefinition(foreign)).toBe(true);
	expect(
		isCollectionDefinition({ key: "articles", config: collectionOptions }),
	).toBe(false);
	expect(getFieldSetState(foreign).fields.has("title")).toBe(true);
});

test("localized field inspection accepts public snapshots", () => {
	const fields = defineBrick({
		key: "test",
		fields: [
			field.text("title"),
			field.text("slug", { localized: false }),
			field.tab("settings", { fields: [] }),
		],
	}).fields;
	for (const [key, field] of fields) {
		expect(isCollectionFieldLocalized({ enabled: true }, field)).toBe(
			key === "title",
		);
		expect(isCollectionFieldLocalized({ enabled: false }, field)).toBe(false);
	}
});
