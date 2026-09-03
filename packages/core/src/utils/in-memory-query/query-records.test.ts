import { describe, expect, test } from "vitest";
import queryRecords from "./query-records.js";

const records = [
	{ name: "Nightly cleanup", state: "active", version: 2 },
	{ name: "Hourly cleanup", state: "paused", version: 1 },
	{ name: "Publish documents", state: "active", version: 3 },
];

const fields = {
	name: { get: (record: (typeof records)[number]) => record.name },
	state: { get: (record: (typeof records)[number]) => record.state },
	version: { get: (record: (typeof records)[number]) => record.version },
};

describe("queryRecords", () => {
	test("uses the public filter, sort and pagination semantics", () => {
		const result = queryRecords({
			records,
			fields,
			query: {
				filter: {
					name: { value: "cleanup", operator: "contains" },
				},
				sort: [{ key: "version", direction: "desc" }],
				page: 1,
				perPage: 1,
			},
		});

		expect(result.count).toBe(2);
		expect(result.data.map(({ name }) => name)).toEqual(["Nightly cleanup"]);
	});

	test("applies valid grouped OR filters and ignores unknown fields", () => {
		const result = queryRecords({
			records,
			fields,
			query: {
				filter: { unknown: { value: "ignored" } },
				filterOr: [
					[
						{ key: "state", value: "paused" },
						{ key: "version", value: "1" },
					],
					[{ key: "name", value: "Publish", operator: "starts-with" }],
				],
				page: 1,
				perPage: -1,
			},
		});

		expect(result.data.map(({ name }) => name)).toEqual([
			"Hourly cleanup",
			"Publish documents",
		]);
	});
});
