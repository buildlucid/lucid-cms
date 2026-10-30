import { createRoot } from "solid-js";
import { describe, expect, it } from "vitest";
import { useTableSelection } from "./useTableSelection";

const pageOne = [{ id: 1 }, { id: 2 }];
const pageTwo = [{ id: 3 }, { id: 4 }];

describe("useTableSelection", () => {
	it("keeps rows from other pages when a page is selected or cleared", () => {
		createRoot((dispose) => {
			const selection = useTableSelection<{ id: number }>();

			selection.toggle(pageOne[0]);
			selection.set(pageTwo, true);
			expect(selection.rows().map((row) => row.id)).toEqual([1, 3, 4]);

			selection.set(pageTwo, false);
			expect(selection.rows().map((row) => row.id)).toEqual([1]);

			selection.toggle(pageOne[0]);
			expect(selection.count()).toBe(0);
			dispose();
		});
	});
});
