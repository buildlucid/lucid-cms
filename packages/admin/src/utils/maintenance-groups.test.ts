import { expect, it } from "vitest";
import { groupMaintenanceTiles } from "./maintenance-groups";

it("orders Clear and Rebuild first, other groups by first appearance, and Remove last", () => {
	const groups = groupMaintenanceTiles([
		{ key: "share-links", group: "remove" },
		{ key: "reindex", group: { key: "search", label: "Search" } },
		{ key: "cache" },
		{ key: "paths", group: "pages" },
		{ key: "suggestions", group: "search" },
		{ key: "images", group: "rebuild" },
	]);

	expect(
		groups.map((group) => [
			group.key,
			group.label,
			group.tiles.map((tile) => tile.key),
		]),
	).toEqual([
		["rebuild", undefined, ["cache", "images"]],
		["search", "Search", ["reindex", "suggestions"]],
		["pages", undefined, ["paths"]],
		["remove", undefined, ["share-links"]],
	]);
});
