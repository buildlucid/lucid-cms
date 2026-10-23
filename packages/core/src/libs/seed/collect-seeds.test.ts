import { expect, test } from "vitest";
import collectSeeds from "./collect-seeds.js";

const seed = async () => {};

test("names file seeds by their stem alongside inline definitions", () => {
	const seeds = collectSeeds({
		modules: [
			{ path: "/project/seeds/project-example.ts", module: { default: seed } },
			{ path: "/project/seeds/helpers.ts", module: {} },
		],
		definitions: [{ name: "pages:example", seed }],
	});

	expect(Object.keys(seeds).sort()).toEqual([
		"pages:example",
		"project-example",
	]);
});

test("rejects seeds that share a name", () => {
	expect(() =>
		collectSeeds({
			modules: [
				{ path: "/project/seeds/example.ts", module: { default: seed } },
			],
			definitions: [{ name: "example", seed }],
		}),
	).toThrow('Duplicate seed name "example"');
});
