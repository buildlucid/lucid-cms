import { expect, test } from "vitest";
import { findSlotConflicts, resolveSlots } from "./slot-policy";
import type { AdminSlot } from "./types/config";

const slots = [
	{ key: "default", slot: "brick.start", component: "default.ts" },
	{
		key: "seo",
		slot: "brick.end",
		component: "seo.ts",
		match: { brick: "seo" },
		priority: 1,
	},
	{ key: "header-one", slot: "brick.header", component: "one.ts" },
	{ key: "header-two", slot: "brick.header", component: "two.ts", priority: 2 },
] satisfies AdminSlot[];

test("selects one side panel and orders additive slots by priority", () => {
	expect(
		resolveSlots(slots, { brick: "seo" }).map((entry) => entry.key),
	).toEqual(["header-two", "seo", "header-one"]);
	expect(
		resolveSlots(slots, { brick: "other" }).map((entry) => entry.key),
	).toEqual(["header-two", "default", "header-one"]);
});
test("last registration wins tied overrides, without reordering additive ties", () => {
	const entries = [
		{
			key: "first",
			slot: "field.cell",
			component: "one.ts",
			match: { field: "slug" },
		},
		{
			key: "second",
			slot: "field.cell",
			component: "two.ts",
			match: { collection: "page", field: "slug" },
			priority: 0,
		},
	] satisfies AdminSlot[];
	expect(
		resolveSlots(entries, { collection: "page", field: "slug" })[0]?.key,
	).toBe("second");
	expect(
		resolveSlots(entries, { collection: "blog", field: "slug" })[0]?.key,
	).toBe("first");
	expect(resolveSlots(entries, { collection: "page", field: "title" })).toEqual(
		[],
	);
	expect(findSlotConflicts(entries)).toEqual([
		{ previous: "first", winner: "second", group: "field.cell" },
	]);
	expect(findSlotConflicts(slots)).toEqual([]);
	const headers = [
		{ key: "one", slot: "brick.header", component: "a.ts" },
		{ key: "two", slot: "brick.header", component: "b.ts" },
	] satisfies AdminSlot[];
	expect(resolveSlots(headers, {}).map((entry) => entry.key)).toEqual([
		"one",
		"two",
	]);
});
