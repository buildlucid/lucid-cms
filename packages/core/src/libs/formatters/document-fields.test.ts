import { describe, expect, test } from "vitest";
import type { InternalDocumentField } from "../../exports/types.js";
import defineBrick from "../collection/define-brick.js";
import field from "../collection/definitions/fields/field.js";
import documentFieldsFormatter from "./document-fields.js";

describe("content response shaping for structural fields", () => {
	test("sections nest their children under the section key by default", () => {
		const brick = defineBrick({
			key: "navItem",
			fields: [
				field.text("title"),
				field.section("badge", {
					fields: [field.text("label"), field.select("theme")],
				}),
			],
		});

		const fields: InternalDocumentField[] = [
			{ key: "title", type: "text", value: "Home" },
			{ key: "label", type: "text", value: "New" },
			{ key: "theme", type: "select", value: "primary" },
		];

		expect(
			documentFieldsFormatter.flattenFields(fields, brick.contentFieldTree),
		).toEqual({
			title: "Home",
			badge: {
				label: "New",
				theme: "primary",
			},
		});
	});

	test("inline sections flatten their children as if absent", () => {
		const brick = defineBrick({
			key: "navItem",
			fields: [
				field.section("badge", {
					output: "inline",
					fields: [field.text("label")],
				}),
			],
		});

		const fields: InternalDocumentField[] = [
			{ key: "label", type: "text", value: "New" },
		];

		expect(
			documentFieldsFormatter.flattenFields(fields, brick.contentFieldTree),
		).toEqual({
			label: "New",
		});
	});

	test("collapsibles support nested and inline output", () => {
		const nestedBrick = defineBrick({
			key: "navItem",
			fields: [
				field.collapsible("advanced", { fields: [field.text("anchorLabel")] }),
			],
		});

		const inlineBrick = defineBrick({
			key: "navItem",
			fields: [
				field.collapsible("advanced", {
					output: "inline",
					fields: [field.text("anchorLabel")],
				}),
			],
		});

		const fields: InternalDocumentField[] = [
			{ key: "anchorLabel", type: "text", value: "Jump to" },
		];

		expect(
			documentFieldsFormatter.flattenFields(
				fields,
				nestedBrick.contentFieldTree,
			),
		).toEqual({
			advanced: { anchorLabel: "Jump to" },
		});

		expect(
			documentFieldsFormatter.flattenFields(
				fields,
				inlineBrick.contentFieldTree,
			),
		).toEqual({
			anchorLabel: "Jump to",
		});
	});

	test("tabs stay transparent in content responses", () => {
		const brick = defineBrick({
			key: "navItem",
			fields: [
				field.tab("contentTab", { fields: [field.text("title")] }),
				field.tab("settingsTab", {
					fields: [field.section("badge", { fields: [field.text("label")] })],
				}),
			],
		});

		const fields: InternalDocumentField[] = [
			{ key: "title", type: "text", value: "Home" },
			{ key: "label", type: "text", value: "New" },
		];

		expect(
			documentFieldsFormatter.flattenFields(fields, brick.contentFieldTree),
		).toEqual({
			title: "Home",
			badge: { label: "New" },
		});
	});

	test("sections inside repeater groups shape each group", () => {
		const brick = defineBrick({
			key: "navItem",
			fields: [
				field.repeater("items", {
					fields: [
						field.text("title"),
						field.section("meta", {
							output: "nested",
							fields: [field.text("caption")],
						}),
					],
				}),
			],
		});

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
			documentFieldsFormatter.flattenFields(fields, brick.contentFieldTree),
		).toEqual({
			items: [
				{ title: "First", meta: { caption: "Caption one" } },
				{ title: "Second", meta: { caption: "Caption two" } },
			],
		});
	});

	test("nested structural fields shape recursively", () => {
		const brick = defineBrick({
			key: "navItem",
			fields: [
				field.section("outer", {
					fields: [
						field.text("outerText"),
						field.collapsible("inner", {
							output: "inline",
							fields: [field.text("innerText")],
						}),
					],
				}),
			],
		});

		const fields: InternalDocumentField[] = [
			{ key: "outerText", type: "text", value: "outer" },
			{ key: "innerText", type: "text", value: "inner" },
		];

		expect(
			documentFieldsFormatter.flattenFields(fields, brick.contentFieldTree),
		).toEqual({
			outer: {
				outerText: "outer",
				innerText: "inner",
			},
		});
	});

	test("flattening without a content field tree keeps the legacy flat shape", () => {
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
