import type { Collection } from "@types";
import { createRoot } from "solid-js";
import { afterEach, describe, expect, test, vi } from "vitest";
import type { PreviewFieldTarget } from "@/preview/protocol";
import brickStore from "@/store/brickStore/brickStore";
import { usePreviewFieldEdit } from "./usePreviewFieldEdit";

const { spawnToast } = vi.hoisted(() => ({ spawnToast: vi.fn() }));
vi.mock("@/utils/spawn-toast", () => ({ default: spawnToast }));

const collection = {
	key: "page",
	fields: [
		{ type: "text", key: "title" },
		{ type: "text", key: "code", permissions: { update: "never" } },
		{
			type: "section",
			key: "seo",
			output: "nested",
			fields: [{ type: "textarea", key: "summary" }],
		},
		{
			type: "collapsible",
			key: "more",
			output: "inline",
			fields: [
				{
					type: "repeater",
					key: "links",
					fields: [
						{ type: "text", key: "label" },
						{ type: "media", key: "icon" },
					],
				},
			],
		},
	],
	fixedBricks: [],
	builderBricks: [],
} as unknown as Collection;

const page = { collectionKey: "page", documentId: 1 };
const at = (...path: Array<string | number>): PreviewFieldTarget => ({
	...page,
	path,
});
const value = (key: string) =>
	brickStore.get.bricks[0]?.fields.find((field) => field.key === key)?.value;

const setup = () => {
	brickStore.set("bricks", [
		{
			ref: "collection-pseudo-brick",
			key: "collection-pseudo-brick",
			order: -1,
			type: "collection-fields",
			open: true,
			fields: [
				{ key: "title", type: "text", value: "Fast setup" },
				{ key: "summary", type: "textarea", value: "" },
				{
					key: "links",
					type: "repeater",
					groups: [
						{
							ref: "one",
							order: 0,
							open: false,
							fields: [{ key: "label", type: "text", value: "Docs" }],
						},
					],
				},
			],
		},
	]);
	return createRoot((dispose) => ({
		edit: usePreviewFieldEdit({
			collection: () => collection,
			collectionKey: () => "page",
			documentId: () => 1,
			locales: () => ["en"],
		}),
		dispose,
	}));
};

afterEach(() => {
	brickStore.get.reset();
	spawnToast.mockClear();
});

describe("editing fields from the preview", () => {
	test("types into a field the page shows as one undo step, putting it back when cancelled", () => {
		const { edit, dispose } = setup();
		const title = at("title");

		expect(edit.request(title, "  Fast\nsetup ")).toEqual({
			mode: "inline",
			multiline: false,
			clear: false,
		});
		edit.input(title, "Faster");
		edit.input(title, "Faster setup");
		edit.end(title, false);
		expect(value("title")).toBe("Faster setup");
		expect(brickStore.edits.peekUndo()?.kind).toBe("bricks");
		brickStore.edits.undo();
		expect(value("title")).toBe("Fast setup");

		edit.request(title, "Fast setup");
		edit.input(title, "Oops");
		edit.end(title, true);
		expect(value("title")).toBe("Fast setup");
		expect(brickStore.edits.canUndo()).toBe(false);
		dispose();
	});

	test("types over a placeholder for an empty field, through nested sections and repeater items", () => {
		const { edit, dispose } = setup();

		expect(edit.request(at("seo", "summary"), "Write a summary")).toEqual({
			mode: "inline",
			multiline: true,
			clear: true,
		});
		edit.end(at("seo", "summary"), false);
		expect(edit.request(at("links", 0, "label"), "Docs")).toMatchObject({
			mode: "inline",
		});
		edit.input(at("links", 0, "label"), "Guides");
		//* text sent for another field is ignored
		edit.input(at("title"), "Nope");
		edit.end(at("links", 0, "label"), false);
		expect(
			brickStore.get.bricks[0]?.fields.find((field) => field.key === "links")
				?.groups?.[0]?.fields[0]?.value,
		).toBe("Guides");
		expect(value("title")).toBe("Fast setup");
		dispose();
	});

	test("leaves fields the page shows differently, non-text fields and repeaters to the builder", () => {
		const { edit, dispose } = setup();

		expect(edit.request(at("title"), "Read more: Fast setup")).toEqual({
			mode: "builder",
		});
		expect(edit.request(at("title"), null)).toEqual({ mode: "builder" });
		expect(edit.request(at("links", 0, "icon"), null)).toEqual({
			mode: "builder",
		});
		expect(edit.request(at("links"), null)).toEqual({ mode: "builder" });
		expect(edit.request(at("links", 3, "label"), "Docs")).toEqual({
			mode: "builder",
		});
		dispose();
	});

	test("doesn't edit locked fields", () => {
		const { edit, dispose } = setup();

		expect(edit.request(at("code"), "")).toEqual({ mode: "none" });
		expect(spawnToast).toHaveBeenCalledTimes(1);
		dispose();
	});
});
