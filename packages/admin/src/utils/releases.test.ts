import { describe, expect, test } from "vitest";
import { getAllowedTargets } from "./releases";

const collection = {
	publishing: {
		targets: [{ key: "staging" }, { key: "production" }],
	},
};

describe("getAllowedTargets", () => {
	test("only environments are selectable; snapshots move forward", () => {
		expect(getAllowedTargets(collection, "latest")).toEqual([
			"staging",
			"production",
		]);
		expect(getAllowedTargets(collection, "staging")).toEqual(["production"]);
		expect(getAllowedTargets(collection, "production")).toEqual([]);
		expect(getAllowedTargets(collection, "proposal")).toEqual([]);
	});
});
