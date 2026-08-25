import { describe, expect, it } from "vitest";
import { addRefTarget } from "./targets.js";
import type { RefTargets } from "./types.js";

describe("addRefTarget", () => {
	it("deduplicates values within a resource and table", () => {
		const refs: RefTargets = {};

		addRefTarget(refs, {
			resource: "users",
			table: "lucid_users",
			value: 1,
		});
		addRefTarget(refs, {
			resource: "users",
			table: "lucid_users",
			value: 1,
		});
		addRefTarget(refs, {
			resource: "users",
			table: "lucid_users",
			value: 2,
		});

		expect(refs.users).toEqual(new Map([["lucid_users", new Set([1, 2])]]));
	});

	it("keeps targets from different tables in separate groups", () => {
		const refs: RefTargets = {};

		addRefTarget(refs, {
			resource: "documents",
			table: "lucid_document__pages",
			value: 1,
		});
		addRefTarget(refs, {
			resource: "documents",
			table: "lucid_document__articles",
			value: 1,
		});

		expect(refs.documents?.size).toBe(2);
	});
});
