import type { Collection } from "@types";
import { createRoot } from "solid-js";
import { afterEach, describe, expect, test, vi } from "vitest";
import type { PreviewFieldTarget } from "@/preview/protocol";
import brickStore, { type BrickData } from "@/store/brickStore/brickStore";
import { usePreviewStructure } from "./usePreviewStructure";

const { spawnToast } = vi.hoisted(() => ({ spawnToast: vi.fn() }));
vi.mock("@/utils/spawn-toast", () => ({ default: spawnToast }));

const collection = {
	fields: [
		{
			type: "collapsible",
			key: "more",
			output: "inline",
			fields: [
				{
					type: "repeater",
					key: "links",
					validation: { maxGroups: 3 },
					fields: [{ type: "text", key: "label" }],
				},
			],
		},
	],
	fixedBricks: [],
	builderBricks: [
		{ key: "hero", details: {}, fields: [] },
		{ key: "legal", details: {}, fields: [], permissions: { update: "never" } },
	],
} as unknown as Collection;

const builderBrick = (ref: string, key: string, order: number): BrickData => ({
	ref,
	key,
	order,
	type: "builder",
	open: false,
	fields: [],
});

const group = (ref: string, order: number) => ({
	ref,
	order,
	open: false,
	fields: [{ key: "label", type: "text" as const, value: ref }],
});

const page = { collectionKey: "page", documentId: 1 };
const brick = (ref: string, key = "hero"): PreviewFieldTarget => ({
	...page,
	brick: { type: "builder", key, ref },
	path: [],
});
const link = (index: number): PreviewFieldTarget => ({
	...page,
	path: ["links", index],
});

const bricks = () =>
	brickStore.get.bricks
		.filter((item) => item.type === "builder")
		.sort((a, b) => a.order - b.order)
		.map((item) => item.ref);
const links = () =>
	brickStore.get.bricks[0]?.fields[0]?.groups?.map((item) => item.ref) ?? [];

const setup = () => {
	brickStore.set("bricks", [
		{
			ref: "collection-pseudo-brick",
			key: "collection-pseudo-brick",
			order: -1,
			type: "collection-fields",
			open: true,
			fields: [
				{
					key: "links",
					type: "repeater",
					groups: [group("one", 0), group("two", 1)],
				},
			],
		},
		builderBrick("a", "hero", 0),
		builderBrick("b", "hero", 1),
		builderBrick("c", "legal", 2),
	]);
	const reveal = vi.fn();
	return createRoot((dispose) => ({
		structure: usePreviewStructure({
			collection: () => collection,
			collectionKey: () => "page",
			documentId: () => 1,
			locales: () => ["en"],
			reveal,
		}),
		reveal,
		dispose,
	}));
};

afterEach(() => {
	brickStore.get.reset();
	spawnToast.mockClear();
});

describe("structure changes from the preview", () => {
	test("moves bricks next to an anchor and removes only those the user can change", () => {
		const { structure, dispose } = setup();

		structure.handle(brick("a"), {
			action: "move",
			place: "after",
			anchor: brick("b"),
		});
		expect(bricks()).toEqual(["b", "a", "c"]);
		structure.handle(brick("c", "legal"), { action: "remove" });
		expect(bricks()).toEqual(["b", "a", "c"]);
		expect(spawnToast).toHaveBeenCalledOnce();
		structure.handle({ ...brick("a"), documentId: 2 }, { action: "remove" });
		structure.handle(brick("a"), { action: "remove" });
		expect(bricks()).toEqual(["b", "c"]);
		dispose();
	});

	test("adds a brick next to another and opens it", () => {
		const { structure, reveal, dispose } = setup();

		structure.handle(brick("a"), {
			action: "add",
			place: "after",
			brickKey: "hero",
		});
		const added = bricks()[1] ?? "";
		expect(bricks()).toEqual(["a", added, "b", "c"]);
		expect(reveal).toHaveBeenCalledWith(brick(added));
		dispose();
	});

	test("adds, moves and removes repeater items, up to the repeater's limit", () => {
		const { structure, reveal, dispose } = setup();

		expect(structure.capacity(link(0))).toEqual({
			count: 2,
			max: 3,
			canAdd: true,
		});
		structure.handle(link(0), { action: "add", place: "after" });
		const added = links()[1] ?? "";
		expect(links()).toEqual(["one", added, "two"]);
		expect(reveal).toHaveBeenCalledWith(link(1));
		expect(structure.capacity({ ...page, path: ["links"] })).toEqual({
			count: 3,
			max: 3,
			canAdd: false,
		});

		structure.handle(
			{ ...page, path: ["links"] },
			{ action: "add", place: "after" },
		);
		expect(links()).toHaveLength(3);
		expect(spawnToast).toHaveBeenCalledOnce();

		structure.handle(link(2), {
			action: "move",
			place: "before",
			anchor: link(0),
		});
		expect(links()).toEqual(["two", "one", added]);
		structure.handle(link(0), { action: "remove" });
		expect(links()).toEqual(["one", added]);
		dispose();
	});

	test("undoes a change only while it's the last one made", () => {
		const { structure, dispose } = setup();

		const removed = structure.handle(brick("a"), { action: "remove" });
		if (removed === null) throw new Error("not removed");
		structure.undo(removed);
		expect(bricks()).toEqual(["a", "b", "c"]);

		//* an older removal's undo leaves a later change alone
		const again = structure.handle(brick("a"), { action: "remove" });
		structure.handle(brick("b"), {
			action: "add",
			place: "after",
			brickKey: "hero",
		});
		if (again === null) throw new Error("not removed");
		structure.undo(again);
		expect(bricks()).toHaveLength(3);
		expect(bricks()).not.toContain("a");
		dispose();
	});
});
