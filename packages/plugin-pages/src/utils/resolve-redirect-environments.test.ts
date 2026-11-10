import { describe, expect, test } from "vitest";
import resolveRedirectEnvironments from "./resolve-redirect-environments.js";

describe("redirect environments", () => {
	test("merges pages collections' environments, requiring only what all of them require", () => {
		const environments = resolveRedirectEnvironments(undefined, [
			{
				key: "page",
				environments: [
					{ key: "staging", label: "Staging" },
					{ key: "production", label: "Production", requires: ["staging"] },
				],
			},
			{
				key: "blog",
				environments: [
					{ key: "staging", label: "Blog staging" },
					{ key: "production", label: "Blog production" },
				],
			},
			{ key: "docs" },
		]);

		expect(environments).toEqual([
			{ key: "staging", label: "Staging" },
			{ key: "production", label: "Production" },
		]);
	});

	test("keeps a requirement every collection shares", () => {
		const environments = resolveRedirectEnvironments(undefined, [
			{
				key: "page",
				environments: [
					{ key: "staging", label: "Staging" },
					{ key: "production", label: "Production", requires: ["staging"] },
				],
			},
			{
				key: "blog",
				environments: [
					{ key: "staging", label: "Staging" },
					{ key: "production", label: "Production", requires: ["staging"] },
				],
			},
		]);

		expect(environments[1]).toEqual({
			key: "production",
			label: "Production",
			requires: ["staging"],
		});
	});

	test("uses configured environments as given", () => {
		const configured = [{ key: "live", label: "Live" }];

		expect(
			resolveRedirectEnvironments(configured, [
				{ key: "page", environments: [{ key: "staging", label: "Staging" }] },
			]),
		).toEqual(configured);
	});
});
