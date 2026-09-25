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

test("widget slots match both key and version and allow explicit overrides", () => {
	const entries = [
		{
			key: "note-v1",
			slot: "agent.widget",
			match: { widget: "note", version: 1 },
			component: "v1.tsx",
		},
		{
			key: "note-v2",
			slot: "agent.widget",
			match: { widget: "note", version: 2 },
			component: "v2.tsx",
		},
		{
			key: "note-override",
			slot: "agent.widget",
			match: { widget: "note", version: 1 },
			component: "custom.tsx",
			priority: 1,
		},
	] satisfies AdminSlot[];
	expect(
		resolveSlots(entries, { widget: "note", version: 1 }).map(
			(entry) => entry.key,
		),
	).toEqual(["note-override"]);
	expect(
		resolveSlots(entries, { widget: "note", version: 2 }).map(
			(entry) => entry.key,
		),
	).toEqual(["note-v2"]);
	expect(resolveSlots(entries, { widget: "note", version: 3 })).toEqual([]);
	expect(resolveSlots(entries, { widget: "other", version: 1 })).toEqual([]);
	expect(findSlotConflicts(entries)).toEqual([]);
});
