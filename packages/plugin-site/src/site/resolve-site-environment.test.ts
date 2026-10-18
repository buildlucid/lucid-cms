import type { ResolvedLucidConfig } from "@lucidcms/core/types";
import { describe, expect, test } from "vitest";
import resolveSiteEnvironment from "./resolve-site-environment.js";

const configWith = (
	...collections: Array<Array<{ key: string; requires: string[] }>>
) =>
	({
		collections: collections.map((environments, index) => ({
			key: `collection-${index}`,
			getData: { publishing: { environments } },
		})),
	}) as unknown as ResolvedLucidConfig;

const staged = [
	{ key: "staging", requires: [] },
	{ key: "production", requires: ["staging"] },
];

describe("resolveSiteEnvironment", () => {
	test("infers the final environment every collection shares", () => {
		expect(
			resolveSiteEnvironment(configWith(staged, staged, []), undefined),
		).toBe("production");
	});

	test("shows latest everywhere when no collection has environments", () => {
		expect(resolveSiteEnvironment(configWith([], []), undefined)).toBeNull();
	});

	test("asks for an environment when collections end in different ones", () => {
		expect(() =>
			resolveSiteEnvironment(
				configWith(staged, [{ key: "staging", requires: [] }]),
				undefined,
			),
		).toThrow(/Set 'environment'/);
	});

	test("takes a configured environment, and rejects one no collection has", () => {
		const config = configWith(staged, [{ key: "staging", requires: [] }]);
		expect(resolveSiteEnvironment(config, "staging")).toBe("staging");
		expect(resolveSiteEnvironment(config, "latest")).toBe("latest");
		expect(() => resolveSiteEnvironment(config, "prod")).toThrow(
			/isn't an environment/,
		);
	});
});
