import { describe, expect, test } from "vitest";
import LucidError from "../../../../utils/errors/lucid-error.js";
import type { CFConfig } from "../../custom-fields/types.js";
import BrickBuilder from "../brick-builder/index.js";
import FieldBuilder from "./index.js";

describe("section and collapsible builder support", () => {
	test("sections nest their children in the field tree", () => {
		const instance = new FieldBuilder()
			.addText("intro")
			.addSection("badge")
			.addText("label")
			.addSelect("theme")
			.endSection()
			.addText("outro");

		expect(instance.fieldTree.map((f) => f.key)).toEqual([
			"intro",
			"badge",
			"outro",
		]);

		const section = instance.fieldTree[1] as CFConfig<"section">;
		expect(section.type).toBe("section");
		expect(section.fields.map((f) => f.key)).toEqual(["label", "theme"]);
	});

	test("collapsibles nest their children in the field tree", () => {
		const instance = new FieldBuilder()
			.addCollapsible("advanced", { defaultOpen: true })
			.addText("anchorLabel")
			.endCollapsible()
			.addText("after");

		expect(instance.fieldTree.map((f) => f.key)).toEqual(["advanced", "after"]);

		const collapsible = instance.fieldTree[0] as CFConfig<"collapsible">;
		expect(collapsible.type).toBe("collapsible");
		expect(collapsible.defaultOpen).toBe(true);
		expect(collapsible.fields.map((f) => f.key)).toEqual(["anchorLabel"]);
	});

	test("structural fields can nest within each other", () => {
		const instance = new FieldBuilder()
			.addSection("outer")
			.addText("outerText")
			.addCollapsible("inner")
			.addText("innerText")
			.endCollapsible()
			.endSection();

		const outer = instance.fieldTree[0] as CFConfig<"section">;
		expect(outer.fields.map((f) => f.key)).toEqual(["outerText", "inner"]);

		const inner = outer.fields[1] as CFConfig<"collapsible">;
		expect(inner.fields.map((f) => f.key)).toEqual(["innerText"]);
	});

	test("persisted field tree flattens structural fields", () => {
		const instance = new FieldBuilder()
			.addSection("badge")
			.addText("label")
			.endSection()
			.addCollapsible("advanced")
			.addText("anchorLabel")
			.endCollapsible();

		expect(instance.persistedFieldTree.map((f) => f.key)).toEqual([
			"label",
			"anchorLabel",
		]);
	});

	test("storage nesting is unaffected by sections inside repeaters", () => {
		const instance = new FieldBuilder()
			.addRepeater("items")
			.addText("title")
			.addSection("meta")
			.addText("caption")
			.endSection()
			.endRepeater();

		//* full tree keeps the section nested inside the repeater
		const repeater = instance.fieldTree[0] as CFConfig<"repeater">;
		expect(repeater.fields.map((f) => f.key)).toEqual(["title", "meta"]);
		const section = repeater.fields[1] as CFConfig<"section">;
		expect(section.fields.map((f) => f.key)).toEqual(["caption"]);

		//* persisted tree keeps all children directly under the repeater
		const persistedRepeater = instance
			.persistedFieldTree[0] as CFConfig<"repeater">;
		expect(persistedRepeater.fields.map((f) => f.key)).toEqual([
			"title",
			"caption",
		]);

		//* both children share the repeater's storage scope
		expect(instance.fields.get("title")?.treeParent).toBe("items");
		expect(instance.fields.get("caption")?.treeParent).toBe("items");
	});

	test("repeaters nested inside sections keep their own children", () => {
		const instance = new FieldBuilder()
			.addSection("gallery")
			.addRepeater("images")
			.addMedia("image")
			.endRepeater()
			.addText("caption")
			.endSection();

		const section = instance.fieldTree[0] as CFConfig<"section">;
		expect(section.fields.map((f) => f.key)).toEqual(["images", "caption"]);

		const repeater = section.fields[0] as CFConfig<"repeater">;
		expect(repeater.fields.map((f) => f.key)).toEqual(["image"]);

		//* caption belongs to the section, not the repeater
		expect(instance.fields.get("caption")?.treeParent).toBeNull();
		expect(instance.fields.get("image")?.treeParent).toBe("images");
	});

	test("client field tree keeps sections nested and tabs transparent", () => {
		const instance = new BrickBuilder("hero")
			.addTab("contentTab")
			.addText("title")
			.addSection("badge")
			.addText("label")
			.endSection()
			.addTab("settingsTab")
			.addCollapsible("advanced", { output: "inline" })
			.addText("anchorLabel")
			.endCollapsible();

		expect(instance.clientFieldTree.map((f) => f.key)).toEqual([
			"title",
			"badge",
			"advanced",
		]);

		const section = instance.clientFieldTree[1] as CFConfig<"section">;
		expect(section.fields.map((f) => f.key)).toEqual(["label"]);

		const collapsible = instance.clientFieldTree[2] as CFConfig<"collapsible">;
		expect(collapsible.output).toBe("inline");
		expect(collapsible.fields.map((f) => f.key)).toEqual(["anchorLabel"]);
	});

	test("sections render inside their tab in the full field tree", () => {
		const instance = new BrickBuilder("hero")
			.addTab("contentTab")
			.addSection("badge")
			.addText("label")
			.endSection();

		const tab = instance.fieldTree[0] as CFConfig<"tab">;
		expect(tab.type).toBe("tab");
		expect(tab.fields.map((f) => f.key)).toEqual(["badge"]);

		const section = tab.fields[0] as CFConfig<"section">;
		expect(section.fields.map((f) => f.key)).toEqual(["label"]);
	});

	test("width config is stored on structural and normal fields", () => {
		const instance = new FieldBuilder()
			.addSection("badge", { ui: { width: 6 } })
			.addText("label", { ui: { width: 4 } })
			.endSection();

		const section = instance.fieldTree[0] as CFConfig<"section">;
		expect(section.ui?.width).toBe(6);
		expect(section.fields[0]?.ui?.width).toBe(4);
	});
});

describe("tab targeting", () => {
	test("fields can be added to an existing tab", () => {
		const instance = new FieldBuilder()
			.addTab("content")
			.addText("title")
			.addTab("settings")
			.addText("theme")
			.addToTab("content")
			.addText("summary");

		const contentTab = instance.fieldTree[0] as CFConfig<"tab">;
		const settingsTab = instance.fieldTree[1] as CFConfig<"tab">;

		expect(contentTab.fields.map((field) => field.key)).toEqual([
			"title",
			"summary",
		]);
		expect(settingsTab.fields.map((field) => field.key)).toEqual(["theme"]);
	});

	test("targeting a missing tab preserves the current field position", () => {
		const instance = new FieldBuilder()
			.addText("title")
			.addToTab("routing")
			.addText("slug");

		expect(instance.fieldTree.map((field) => field.key)).toEqual([
			"title",
			"slug",
		]);
	});

	test("targeting a key owned by another field type throws", () => {
		const instance = new FieldBuilder().addText("routing");

		expect(() => instance.addToTab("routing")).toThrow(LucidError);
		expect(() => instance.addToTab("routing")).toThrow(
			"Cannot add fields to tab 'routing' because that key belongs to a text field.",
		);
	});
});
