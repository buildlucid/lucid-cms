import { describe, expect, test } from "vitest";
import { clientSlot, slotPlaceholders } from "./client-slot.js";

describe("slotPlaceholders", () => {
	const inner =
		'<client-component client="load">' +
		clientSlot("default", "<b>inner</b>") +
		"</client-component>";
	const { placeholders, fill } = slotPlaceholders("a1", { default: inner });
	const rendered = `<div>${clientSlot("default", placeholders.default ?? "")}</div>`;

	test("keeps this render's wrapper for hydration, around the slot's HTML", () => {
		expect(fill(rendered, true)).toBe(
			`<div>${clientSlot("default", inner)}</div>`,
		);
	});

	test("drops only this render's wrapper, keeping those of components inside", () => {
		expect(fill(rendered, false)).toBe(`<div>${inner}</div>`);
	});
});
