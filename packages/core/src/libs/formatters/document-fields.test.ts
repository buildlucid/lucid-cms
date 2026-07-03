import { describe, expect, test } from "vitest";
import type { InternalDocumentField } from "../../types.js";
import BrickBuilder from "../collection/builders/brick-builder/index.js";
import documentFieldsFormatter from "./document-fields.js";

describe("client response shaping for structural fields", () => {
	test("sections nest their children under the section key by default", () => {
		const brick = new BrickBuilder("navItem")
			.addText("title")
			.addSection("badge")
			.addText("label")
			.addSelect("theme")
			.endSection();

		const fields: InternalDocumentField[] = [
			{ key: "title", type: "text", value: "Home" },
			{ key: "label", type: "text", value: "New" },
			{ key: "theme", type: "select", value: "primary" },
		];

		expect(
			documentFieldsFormatter.flattenFields(fields, brick.clientFieldTree),
		).toEqual({
			title: "Home",
			badge: {
				label: "New",
				theme: "primary",
			},
		});
	});

	test("inline sections flatten their children as if absent", () => {
		const brick = new BrickBuilder("navItem")
			.addSection("badge", { output: "inline" })
			.addText("label")
			.endSection();

		const fields: InternalDocumentField[] = [
			{ key: "label", type: "text", value: "New" },
		];

		expect(
			documentFieldsFormatter.flattenFields(fields, brick.clientFieldTree),
		).toEqual({
			label: "New",
		});
	});

	test("collapsibles support nested and inline output", () => {
		const nestedBrick = new BrickBuilder("navItem")
			.addCollapsible("advanced")
			.addText("anchorLabel")
			.endCollapsible();

		const inlineBrick = new BrickBuilder("navItem")
			.addCollapsible("advanced", { output: "inline" })
			.addText("anchorLabel")
			.endCollapsible();

		const fields: InternalDocumentField[] = [
			{ key: "anchorLabel", type: "text", value: "Jump to" },
		];

		expect(
			documentFieldsFormatter.flattenFields(
				fields,
				nestedBrick.clientFieldTree,
			),
		).toEqual({
			advanced: { anchorLabel: "Jump to" },
		});

		expect(
			documentFieldsFormatter.flattenFields(
				fields,
				inlineBrick.clientFieldTree,
			),
		).toEqual({
			anchorLabel: "Jump to",
		});
	});

	test("tabs stay transparent in client responses", () => {
		const brick = new BrickBuilder("navItem")
			.addTab("contentTab")
			.addText("title")
			.addTab("settingsTab")
			.addSection("badge")
			.addText("label")
			.endSection();

		const fields: InternalDocumentField[] = [
			{ key: "title", type: "text", value: "Home" },
			{ key: "label", type: "text", value: "New" },
		];

		expect(
			documentFieldsFormatter.flattenFields(fields, brick.clientFieldTree),
		).toEqual({
			title: "Home",
			badge: { label: "New" },
		});
	});

	test("sections inside repeater groups shape each group", () => {
		const brick = new BrickBuilder("navItem")
			.addRepeater("items")
			.addText("title")
			.addSection("meta", { output: "nested" })
			.addText("caption")
			.endSection()
			.endRepeater();

		const fields: InternalDocumentField[] = [
			{
				key: "items",
				type: "repeater",
				groups: [
					{
						ref: "group-1",
						order: 0,
						open: false,
						fields: [
							{ key: "title", type: "text", value: "First" },
							{ key: "caption", type: "text", value: "Caption one" },
						],
					},
					{
						ref: "group-2",
						order: 1,
						open: false,
						fields: [
							{ key: "title", type: "text", value: "Second" },
							{ key: "caption", type: "text", value: "Caption two" },
						],
					},
				],
			},
		];

		expect(
			documentFieldsFormatter.flattenFields(fields, brick.clientFieldTree),
		).toEqual({
			items: [
				{ title: "First", meta: { caption: "Caption one" } },
				{ title: "Second", meta: { caption: "Caption two" } },
			],
		});
	});

	test("nested structural fields shape recursively", () => {
		const brick = new BrickBuilder("navItem")
			.addSection("outer")
			.addText("outerText")
			.addCollapsible("inner", { output: "inline" })
			.addText("innerText")
			.endCollapsible()
			.endSection();

		const fields: InternalDocumentField[] = [
			{ key: "outerText", type: "text", value: "outer" },
			{ key: "innerText", type: "text", value: "inner" },
		];

		expect(
			documentFieldsFormatter.flattenFields(fields, brick.clientFieldTree),
		).toEqual({
			outer: {
				outerText: "outer",
				innerText: "inner",
			},
		});
	});

	test("flattening without a client field tree keeps the legacy flat shape", () => {
		const fields: InternalDocumentField[] = [
			{ key: "title", type: "text", value: "Home" },
			{ key: "label", type: "text", value: "New" },
		];

		expect(documentFieldsFormatter.flattenFields(fields)).toEqual({
			title: "Home",
			label: "New",
		});
	});
});
