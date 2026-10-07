import { describe, expect, test } from "vitest";
import { getAllowedTargets } from "./requests";

const collection = {
	publishing: {
		targets: [{ key: "staging" }, { key: "production" }],
	},
};

describe("getAllowedTargets", () => {
	test("proposals can target latest; snapshots move forward", () => {
		expect(getAllowedTargets(collection, "latest")).toEqual([
			"latest",
			"staging",
			"production",
		]);
		expect(getAllowedTargets(collection, "staging")).toEqual(["production"]);
		expect(getAllowedTargets(collection, "production")).toEqual([]);
		expect(getAllowedTargets(collection, "proposal")).toEqual([]);
	});
});
