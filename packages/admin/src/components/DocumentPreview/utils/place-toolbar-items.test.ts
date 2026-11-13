import { expect, test } from "vitest";
import type { PreviewToolbarItemKey, PreviewToolbarPosition } from "../types";
import { placeToolbarItems } from "./place-toolbar-items";

const item = (key: PreviewToolbarItemKey) => ({ key });
const entry = (key: string, position?: PreviewToolbarPosition) => ({
	key,
	position,
});
const keys = (placed: ReadonlyArray<{ key: string } | { divider: true }>) =>
	placed.map((value) => ("divider" in value ? "|" : value.key));

test("places entries next to the built-in items they name, in the order given", () => {
	const items = [item("open"), item("width"), item("edit"), item("zoom")];
	expect(
		keys(
			placeToolbarItems(items, [
				entry("end"),
				entry("first", { before: "edit" }),
				entry("second", { before: "edit" }),
				entry("view", { after: "zoom" }),
			]),
		),
	).toEqual([
		"width",
		"zoom",
		"view",
		"|",
		"first",
		"second",
		"edit",
		"open",
		"end",
	]);
});

test("puts entries next to a missing item at the end, and only divides the view items from what follows", () => {
	expect(
		keys(
			placeToolbarItems(
				[item("edit"), item("open")],
				[entry("inspect", { before: "zoom" })],
			),
		),
	).toEqual(["edit", "open", "inspect"]);
	expect(keys(placeToolbarItems([item("width"), item("zoom")], []))).toEqual([
		"width",
		"zoom",
	]);
	expect(keys(placeToolbarItems([item("width")], [entry("inspect")]))).toEqual([
		"width",
		"|",
		"inspect",
	]);
});
