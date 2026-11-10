import { describe, expect, test } from "vitest";
import type { PreviousPath } from "../../schema/previous-paths.js";
import filterPreviousPaths from "./filter-previous-paths.js";

const paths: PreviousPath[] = [
	{ id: 1, environment: "production", locale: "en", path: "/en/a" },
	{ id: 2, environment: "staging", locale: "en", path: "/en/b" },
	{ id: 3, environment: "production", locale: "fr", path: "/fr/a" },
];

const ids = (result: PreviousPath[]) => result.map((path) => path.id);

describe("previous path filters", () => {
	test("match every top-level filter, with != leaving values out", () => {
		expect(
			ids(
				filterPreviousPaths(
					paths,
					new Map([
						["environment", { value: "production" }],
						["locale", { value: "fr", operator: "!=" }],
					]),
					[],
				),
			),
		).toEqual([1]);
	});

	test("ignore empty filters", () => {
		expect(
			ids(filterPreviousPaths(paths, new Map([["locale", { value: "" }]]), [])),
		).toEqual([1, 2, 3]);
	});

	test("match any OR group alongside the top-level filters", () => {
		expect(
			ids(
				filterPreviousPaths(paths, new Map([["locale", { value: "en" }]]), [
					[{ key: "environment", value: "staging" }],
					[{ key: "locale", value: "fr" }],
				]),
			),
		).toEqual([2]);
	});
});
