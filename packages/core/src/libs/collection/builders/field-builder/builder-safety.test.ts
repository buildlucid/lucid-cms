import { describe, expect, expectTypeOf, test, vi } from "vitest";
import { copy } from "../../../i18n/index.js";
import type { FieldOptions } from "../../custom-fields/types.js";
import { isCollectionFieldLocalized } from "../../helpers/resolve-collection-localization.js";
import BrickBuilder from "../brick-builder/index.js";
import CollectionBuilder, {
	isCollectionBuilder,
} from "../collection-builder/index.js";
import type { CollectionOptions } from "../collection-builder/types.js";
import FieldBuilder, { getFieldBuilderState } from "./index.js";

const collectionOptions = {
	mode: "multiple",
	details: { labels: { singular: "Article", plural: "Articles" } },
} satisfies CollectionOptions;

describe("builder ownership", () => {
	test("owns field options and returns detached inspection data", () => {
		const label = copy("admin:tests.title", { defaultMessage: "Title" });
		const ui: NonNullable<FieldOptions<"text">["ui"]> = { width: 6 };
		const options = { details: { label }, ui } satisfies FieldOptions<"text">;
		const builder = new FieldBuilder().addText("title", options);
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
		const brick = new BrickBuilder("hero", { details: { label } }).addText(
			"title",
		);
		const options = {
			...collectionOptions,
			details: { labels: { singular: label, plural: "Articles" } },
			bricks: { fixed: [brick, brick] },
			publishing: { targets: [{ key: "live", label, requires: ["review"] }] },
		} satisfies CollectionOptions;
		const collection = new CollectionBuilder("articles", options);
		const clone = collection.clone();
		expect(options.bricks.fixed).toHaveLength(2);
		expect(collection.config.bricks?.fixed).toHaveLength(1);
		label.defaultMessage = "Changed input";
		brick.addText("later");
		options.publishing.targets[0]?.requires.push("changed");
		expect(collection.fixedBricks[0]?.fields.map((field) => field.key)).toEqual(
			["title"],
		);
		expect(collection.getData.details.labels.singular).toMatchObject({
			defaultMessage: "Hero",
		});
		expect(brick.config.details.label).toMatchObject({
			defaultMessage: "Hero",
		});
		expect(collection.getData.publishing.targets[0]?.requires).toEqual([
			"review",
		]);
		collection.config.bricks?.fixed?.[0]?.addText("original_only");
		collection.config.publishing?.targets?.[0]?.requires?.push("original_only");
		expect(clone.fixedBricks[0]?.fields.map((field) => field.key)).toEqual([
			"title",
		]);
		expect(clone.getData.publishing.targets[0]?.requires).toEqual(["review"]);
		const data = clone.getData;
		if (data.details.labels.singular.type !== "lucid.copy")
			throw new Error("Expected copy descriptor");
		data.details.labels.singular.defaultMessage = "Changed snapshot";
		expect(clone.getData.details.labels.singular).toMatchObject({
			defaultMessage: "Hero",
		});
	});

	test("clones an unfinished fluent builder with independent container state", () => {
		const original = new FieldBuilder().addRepeater("items").addText("title");
		const clone = original.clone().addText("clone_only").endRepeater();
		original.addText("original_only").endRepeater();
		expect(clone.persistedFieldTree).toMatchObject([
			{ key: "items", fields: [{ key: "title" }, { key: "clone_only" }] },
		]);
		expect(original.persistedFieldTree).toMatchObject([
			{ key: "items", fields: [{ key: "title" }, { key: "original_only" }] },
		]);
	});

	test("preserves collection key inference without putting a key in author options", () => {
		const collection = new CollectionBuilder("articles", collectionOptions);
		expectTypeOf(collection.key).toEqualTypeOf<"articles">();
		expectTypeOf(collection.config.key).toEqualTypeOf<"articles">();
		expectTypeOf<CollectionOptions>().not.toHaveProperty("key");
	});
});

describe("field composition", () => {
	test("reuses completed fragments inside nested storage and structural containers", () => {
		const fragment = new FieldBuilder()
			.addSection("content")
			.addText("title")
			.endSection()
			.addRepeater("links")
			.addText("url")
			.endRepeater();
		const first = new FieldBuilder()
			.addRepeater("rows")
			.addCollapsible("panel")
			.addFields(fragment)
			.endCollapsible()
			.endRepeater();
		const second = new FieldBuilder()
			.addSection("wrapper")
			.addFields(fragment)
			.endSection();
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
		expect(getFieldBuilderState(first).meta.repeaterDepth).toEqual({
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
		expect(getFieldBuilderState(second).meta.repeaterDepth).toEqual({
			links: 0,
		});
		expect(fragment.fields.get("content")).toMatchObject({
			treeParent: null,
			structuralParent: null,
		});
		expect(getFieldBuilderState(first).fields.get("title")).not.toBe(
			getFieldBuilderState(second).fields.get("title"),
		);
		fragment.addText("later");
		expect(first.fields.has("later")).toBe(false);
		expect(second.fields.has("later")).toBe(false);
	});

	test("rejects invalid composition before changing fields or collection metadata", () => {
		const collection = new CollectionBuilder(
			"articles",
			collectionOptions,
		).addText("title");
		const before = collection.fieldTree;
		expect(() =>
			collection.addFields(new FieldBuilder().addText("new").addText("title")),
		).toThrow('Field "title" is already registered');
		expect(() =>
			collection.addText("title", { showInList: true, useAsLabel: true }),
		).toThrow("already registered");
		expect(() => collection.addRepeater("title")).toThrow("already registered");
		expect(collection.fieldTree).toEqual(before);
		expect(collection.listing).toEqual([]);
		expect(collection.labelFields).toEqual([]);
		expect(getFieldBuilderState(collection).repeaterStack).toEqual([]);
		expect(() =>
			collection.addFields(new FieldBuilder().addRepeater("unfinished")),
		).toThrow("Complete the source builder");
		const nested = new FieldBuilder().addRepeater("rows");
		expect(() =>
			nested.addFields(new FieldBuilder().addTab("settings")),
		).toThrow("containing tabs");
		expect([...nested.fields.keys()]).toEqual(["rows"]);
	});
});

describe("field placement", () => {
	test("moves Pages leaf fields into their tab and refreshes cached trees", () => {
		const builder = new FieldBuilder()
			.addText("title")
			.addText("slug")
			.addText("path")
			.addTab("routing");
		const before = builder.fieldTree;
		builder.moveFields(["slug", "path"], { index: 2, tab: "routing" });
		expect(builder.fieldTree).not.toEqual(before);
		expect([...builder.fields.keys()]).toEqual([
			"title",
			"routing",
			"slug",
			"path",
		]);
		expect(builder.fieldTree).toMatchObject([
			{ key: "title" },
			{ key: "routing", fields: [{ key: "slug" }, { key: "path" }] },
		]);
		builder.moveFields(["slug"], { index: 0 });
		expect(builder.fields.get("slug")).toMatchObject({
			tabParent: null,
			treeParent: null,
			structuralParent: null,
		});
	});

	test("rejects unsupported moves without damaging nested fields", () => {
		const builder = new FieldBuilder()
			.addSection("section")
			.addText("nested")
			.endSection()
			.addRepeater("rows")
			.addText("row_title")
			.endRepeater()
			.addText("title")
			.addTab("settings");
		const before = builder.fieldTree;
		for (const key of ["section", "nested", "rows", "row_title", "settings"]) {
			expect(() => builder.moveFields([key], { index: 0 })).toThrow(
				"Only independent leaf fields",
			);
		}
		expect(() =>
			builder.moveFields(["title"], { index: 0, tab: "settings" }),
		).toThrow("after their target tab");
		expect(() => builder.moveFields(["title", "title"], { index: 0 })).toThrow(
			"once in a move",
		);
		expect(() => builder.moveFields(["title"], { index: -1 })).toThrow(
			"outside the builder",
		);
		expect(builder.fieldTree).toEqual(before);
		builder.addRepeater("open");
		expect(() => builder.moveFields(["title"], { index: 0 })).toThrow(
			"Complete all repeaters",
		);
	});
});

test("collection identity and field state survive separate loads of core", async () => {
	vi.resetModules();
	const { default: OtherCollectionBuilder } = await import(
		"../collection-builder/index.js"
	);
	const foreign = new OtherCollectionBuilder(
		"articles",
		collectionOptions,
	).addText("title");
	expect(foreign).not.toBeInstanceOf(CollectionBuilder);
	expect(isCollectionBuilder(foreign)).toBe(true);
	expect(
		isCollectionBuilder({ key: "articles", config: collectionOptions }),
	).toBe(false);
	expect(getFieldBuilderState(foreign).fields.has("title")).toBe(true);
	expect(new FieldBuilder().addFields(foreign).fields.has("title")).toBe(true);
});

test("localized field inspection accepts public snapshots", () => {
	const fields = new FieldBuilder()
		.addText("title")
		.addText("slug", { localized: false })
		.addTab("settings").fields;
	for (const [key, field] of fields) {
		expect(isCollectionFieldLocalized({ enabled: true }, field)).toBe(
			key === "title",
		);
		expect(isCollectionFieldLocalized({ enabled: false }, field)).toBe(false);
	}
});
