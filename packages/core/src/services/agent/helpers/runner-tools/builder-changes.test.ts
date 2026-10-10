import { expect, test } from "vitest";
import type { BrickInputSchema } from "../../../../schemas/collection-bricks.js";
import builderChanges from "./builder-changes.js";

const hero = (ref: string, heading: string, order: number) =>
	({
		ref,
		key: "hero",
		type: "builder",
		order,
		fields: [{ key: "heading", type: "text", translations: { en: heading } }],
	}) satisfies BrickInputSchema;

test("hands back changed fields and bricks whole, listing what changed down to repeater items", () => {
	const links = (label: string) => ({
		key: "links",
		type: "repeater" as const,
		groups: [
			{
				ref: "g1",
				order: 0,
				fields: [
					{
						key: "label",
						type: "text" as const,
						translations: { en: label, fr: "Lire" },
					},
				],
			},
		],
	});
	const title = { key: "title", type: "text" as const, value: "Same" };

	const result = builderChanges(
		{
			fields: [title, links("Read")],
			bricks: [hero("a", "One", 0), hero("b", "Two", 1), hero("c", "Three", 2)],
		},
		{
			fields: [title, links("Read more")],
			bricks: [hero("b", "Two", 0), hero("a", "One", 1), hero("d", "Four", 2)],
		},
		new Set(["a"]),
	);

	expect(result.content).toEqual({
		fields: [links("Read more")],
		bricks: [hero("d", "Four", 2)],
		removed: ["c"],
		order: ["b", "a", "d"],
	});
	//* "b" shifted only because "a" moved after it, so only "a" moved
	expect(result.changes).toEqual([
		{
			brick: null,
			status: "changed",
			moved: false,
			fields: [{ path: ["links", "g1", "label"], locales: ["en"] }],
		},
		{
			brick: { type: "builder", key: "hero", ref: "a" },
			status: "changed",
			moved: true,
			fields: [],
		},
		{
			brick: { type: "builder", key: "hero", ref: "d" },
			status: "added",
			moved: false,
			fields: [],
		},
		{
			brick: { type: "builder", key: "hero", ref: "c" },
			status: "removed",
			moved: false,
			fields: [],
		},
	]);
});
