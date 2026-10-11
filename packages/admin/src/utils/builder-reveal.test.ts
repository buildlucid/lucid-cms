import type { InternalDocumentField } from "@types";
import { expect, test } from "vitest";
import { getChangedFieldPaths } from "./builder-reveal";

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
