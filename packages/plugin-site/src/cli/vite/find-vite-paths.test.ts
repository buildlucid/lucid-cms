import { describe, expect, test } from "vitest";
import findVitePaths from "./find-vite-paths.js";

describe("findVitePaths", () => {
	test("collects the written-out paths of vite() and viteAsset(), skipping named arguments", async () => {
		await expect(
			findVitePaths({
				"layouts/base.kiln": `{{ vite("styles/site.css", "scripts/site.ts", attrs: { nonce: nonce }) }}<img src="{{ viteAsset("images/logo.svg") }}">`,
				"components/card.kiln": `{{ vite("./styles/site.css") }}`,
			}),
		).resolves.toEqual({
			entries: ["styles/site.css", "scripts/site.ts"],
			files: ["images/logo.svg"],
		});
	});

	test("fails for paths outside the site directory", async () => {
		await expect(
			findVitePaths({ "page.kiln": `{{ viteAsset("../secret.txt") }}` }),
		).rejects.toThrow(/page\.kiln:1: "\.\.\/secret\.txt" isn't a file inside/);
	});

	test("fails for paths built at render time", async () => {
		await expect(
			findVitePaths({ "page.kiln": `{{ vite("scripts/" ~ name) }}` }),
		).rejects.toThrow(/page\.kiln:1: vite\(\) only takes written-out paths/);
	});
});
