import { expect, test } from "vitest";
import summariseStatuses from "./summarise-statuses.js";

test("adds up pending changes and flags any rebuilding or failed index", () => {
	const summary = summariseStatuses({
		data: [
			{ pending: 2, rebuild: { status: "complete" }, lastError: null },
			{ pending: 3, rebuild: { status: "pending" }, lastError: "Timed out" },
		],
	});

	expect(summary).toEqual({ rebuilding: true, failed: true, pending: 5 });
});
