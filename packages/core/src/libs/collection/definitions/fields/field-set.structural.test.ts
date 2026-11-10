import { describe, expect, test } from "vitest";
import LucidError from "../../../../utils/errors/lucid-error.js";
import type { FieldConfig } from "../../custom-fields/types.js";
import defineBrick from "../../define-brick.js";
import field from "./field.js";
import { getFieldSetState } from "./index.js";

describe("section and collapsible builder support", () => {
	test("sections nest their children in the field tree", () => {
		const instance = defineBrick({
			key: "test",
			fields: [
				field.text("intro"),
				field.section("badge", {
					fields: [field.text("label"), field.select("theme")],
				}),
				field.text("outro"),
			],
		});

		expect(instance.fieldTree.map((f) => f.key)).toEqual([
			"intro",
			"badge",
			"outro",
		]);

		const section = instance.fieldTree[1] as FieldConfig<"section">;
		expect(section.type).toBe("section");
		expect(section.fields.map((f) => f.key)).toEqual(["label", "theme"]);
	});

	test("collapsibles nest their children in the field tree", () => {
		const instance = defineBrick({
			key: "test",
			fields: [
				field.collapsible("advanced", {
					defaultOpen: true,
					fields: [field.text("anchorLabel")],
				}),
				field.text("after"),
			],
		});

		expect(instance.fieldTree.map((f) => f.key)).toEqual(["advanced", "after"]);

		const collapsible = instance.fieldTree[0] as FieldConfig<"collapsible">;
		expect(collapsible.type).toBe("collapsible");
		expect(collapsible.defaultOpen).toBe(true);
		expect(collapsible.fields.map((f) => f.key)).toEqual(["anchorLabel"]);
	});

	test("structural fields can nest within each other", () => {
		const instance = defineBrick({
			key: "test",
			fields: [
				field.section("outer", {
					fields: [
						field.text("outerText"),
						field.collapsible("inner", { fields: [field.text("innerText")] }),
					],
				}),
			],
		});

		const outer = instance.fieldTree[0] as FieldConfig<"section">;
		expect(outer.fields.map((f) => f.key)).toEqual(["outerText", "inner"]);

		const inner = outer.fields[1] as FieldConfig<"collapsible">;
		expect(inner.fields.map((f) => f.key)).toEqual(["innerText"]);
	});

	test("persisted field tree flattens structural fields", () => {
		const instance = defineBrick({
			key: "test",
			fields: [
				field.section("badge", { fields: [field.text("label")] }),
				field.collapsible("advanced", { fields: [field.text("anchorLabel")] }),
			],
		});

		expect(instance.persistedFieldTree.map((f) => f.key)).toEqual([
			"label",
			"anchorLabel",
		]);
	});

	test("storage nesting is unaffected by sections inside repeaters", () => {
		const instance = defineBrick({
			key: "test",
			fields: [
				field.repeater("items", {
					fields: [
						field.text("title"),
						field.section("meta", { fields: [field.text("caption")] }),
					],
				}),
			],
		});

		//* full tree keeps the section nested inside the repeater
		const repeater = instance.fieldTree[0] as FieldConfig<"repeater">;
		expect(repeater.fields.map((f) => f.key)).toEqual(["title", "meta"]);
		const section = repeater.fields[1] as FieldConfig<"section">;
		expect(section.fields.map((f) => f.key)).toEqual(["caption"]);

		//* persisted tree keeps all children directly under the repeater
		const persistedRepeater = instance
			.persistedFieldTree[0] as FieldConfig<"repeater">;
		expect(persistedRepeater.fields.map((f) => f.key)).toEqual([
			"title",
			"caption",
		]);

		//* both children share the repeater's storage scope
		expect(getFieldSetState(instance).fields.get("title")?.treeParent).toBe(
			"items",
		);
		expect(getFieldSetState(instance).fields.get("caption")?.treeParent).toBe(
			"items",
		);
	});

	test("repeaters nested inside sections keep their own children", () => {
		const instance = defineBrick({
			key: "test",
			fields: [
				field.section("gallery", {
					fields: [
						field.repeater("images", { fields: [field.media("image")] }),
						field.text("caption"),
					],
				}),
			],
		});

		const section = instance.fieldTree[0] as FieldConfig<"section">;
		expect(section.fields.map((f) => f.key)).toEqual(["images", "caption"]);

		const repeater = section.fields[0] as FieldConfig<"repeater">;
		expect(repeater.fields.map((f) => f.key)).toEqual(["image"]);

		//* caption belongs to the section, not the repeater
		expect(
			getFieldSetState(instance).fields.get("caption")?.treeParent,
		).toBeNull();
		expect(getFieldSetState(instance).fields.get("image")?.treeParent).toBe(
			"images",
		);
	});

	test("content field tree keeps sections nested and tabs transparent", () => {
		const instance = defineBrick({
			key: "hero",
			fields: [
				field.tab("contentTab", {
					fields: [
						field.text("title"),
						field.section("badge", { fields: [field.text("label")] }),
					],
				}),
				field.tab("settingsTab", {
					fields: [
						field.collapsible("advanced", {
							output: "inline",
							fields: [field.text("anchorLabel")],
						}),
					],
				}),
			],
		});

		expect(instance.contentFieldTree.map((f) => f.key)).toEqual([
			"title",
			"badge",
			"advanced",
		]);

		const section = instance.contentFieldTree[1] as FieldConfig<"section">;
		expect(section.fields.map((f) => f.key)).toEqual(["label"]);

		const collapsible = instance
			.contentFieldTree[2] as FieldConfig<"collapsible">;
		expect(collapsible.output).toBe("inline");
		expect(collapsible.fields.map((f) => f.key)).toEqual(["anchorLabel"]);
	});

	test("sections render inside their tab in the full field tree", () => {
		const instance = defineBrick({
			key: "hero",
			fields: [
				field.tab("contentTab", {
					fields: [field.section("badge", { fields: [field.text("label")] })],
				}),
			],
		});

		const tab = instance.fieldTree[0] as FieldConfig<"tab">;
		expect(tab.type).toBe("tab");
		expect(tab.fields.map((f) => f.key)).toEqual(["badge"]);

		const section = tab.fields[0] as FieldConfig<"section">;
		expect(section.fields.map((f) => f.key)).toEqual(["label"]);
	});

	test("width config is stored on structural and normal fields", () => {
		const instance = defineBrick({
			key: "test",
			fields: [
				field.section("badge", {
					ui: { width: 6 },
					fields: [field.text("label", { ui: { width: 4 } })],
				}),
			],
		});

		const section = instance.fieldTree[0] as FieldConfig<"section">;
		expect(section.ui?.width).toBe(6);
		expect(section.fields[0]?.ui?.width).toBe(4);
	});
});

describe("inserting into tabs", () => {
	const build = () =>
		defineBrick({
			key: "test",
			fields: [
				field.tab("content", { fields: [field.text("title")] }),
				field.tab("settings", { fields: [field.text("theme")] }),
			],
		});

	test("fields can be added to an existing tab", () => {
		const instance = build();
		instance.insertFields([field.text("summary")], {
			at: "end",
			tab: "content",
		});
		instance.insertFields([field.text("lead")], {
			at: "start",
			tab: "content",
		});

		const contentTab = instance.fieldTree[0] as FieldConfig<"tab">;
		const settingsTab = instance.fieldTree[1] as FieldConfig<"tab">;

		expect(contentTab.fields.map((f) => f.key)).toEqual([
			"lead",
			"title",
			"summary",
		]);
		expect(settingsTab.fields.map((f) => f.key)).toEqual(["theme"]);
	});

	test("targeting a missing tab or another field type throws", () => {
		const instance = build();
		const before = instance.fieldTree;

		expect(() =>
			instance.insertFields([field.text("slug")], {
				at: "end",
				tab: "routing",
			}),
		).toThrow(LucidError);
		expect(() =>
			instance.insertFields([field.text("slug")], { at: "end", tab: "title" }),
		).toThrow('Tab "title" does not exist.');
		expect(instance.fieldTree).toEqual(before);
	});

	test("tabs cannot be added inside a tab", () => {
		expect(() =>
			build().insertFields([field.tab("nested", { fields: [] })], {
				at: "end",
				tab: "content",
			}),
		).toThrow("Tabs only go at the top level");
	});
});
