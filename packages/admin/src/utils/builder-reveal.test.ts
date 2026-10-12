import type { Collection, InternalDocumentField } from "@types";
import { expect, test } from "vitest";
import { getChangedFieldPaths, revealBuilderField } from "./builder-reveal";
import { getPreviewStructureId } from "./preview-focus-dom";

const links = (
	items: Array<{ ref: string; label: string; open?: boolean }>,
): InternalDocumentField => ({
	key: "links",
	type: "repeater",
	groups: items.map((item, order) => ({
		ref: item.ref,
		order,
		open: item.open ?? false,
		fields: [{ key: "label", type: "text", value: item.label }],
	})),
});

test("changed fields are listed down to the repeater item, ignoring items that only opened", () => {
	const before = [
		{ key: "title", type: "text", value: "Hello" },
		links([
			{ ref: "a", label: "Docs" },
			{ ref: "b", label: "Blog" },
		]),
	] satisfies InternalDocumentField[];
	const after = [
		{ key: "title", type: "text", value: "Hello" },
		links([
			{ ref: "a", label: "Docs", open: true },
			{ ref: "b", label: "News" },
		]),
	] satisfies InternalDocumentField[];

	expect(getChangedFieldPaths(after, before)).toEqual([["links", 1, "label"]]);
});

test("items added, removed or reordered point at their repeater", () => {
	const before = [links([{ ref: "a", label: "Docs" }])];
	const after = [
		links([
			{ ref: "a", label: "Docs" },
			{ ref: "b", label: "Blog" },
		]),
	];

	expect(getChangedFieldPaths(after, before)).toEqual([["links"]]);
});

test("a fixed brick on its own reveals its header", async () => {
	const header = document.createElement("div");
	header.id = getPreviewStructureId({ brickIndex: 1, type: "brick" });
	document.body.append(header);

	const shown = await revealBuilderField({
		collection: {} as Collection,
		collectionKey: "page",
		documentId: 1,
		bricks: [
			{
				ref: "fields",
				key: "fields",
				order: 0,
				type: "collection-fields",
				open: true,
				fields: [],
			},
			{
				ref: "fixed:seo",
				key: "seo",
				order: 1,
				type: "fixed",
				open: false,
				fields: [],
			},
		],
		brickIndex: 1,
		path: [],
	});

	expect(shown).toBe(true);
	header.remove();
});
