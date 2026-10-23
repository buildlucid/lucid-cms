import { describe, expect, test } from "vitest";
import createViteAssetFunction from "./vite-asset.js";

describe("viteAsset()", () => {
	test("returns the source URL in development and the built file's URL once built", () => {
		expect(
			createViteAssetFunction({ kind: "dev", prefix: "site/", revision: "1" })(
				"./images/logo.svg",
			),
		).toBe("/site/images/logo.svg");
		expect(
			createViteAssetFunction({
				kind: "build",
				buildId: "build",
				prefix: "site/",
				ui: null,
				manifest: { "site/images/logo.svg": { file: "_assets/logo-a1.svg" } },
			})("images/logo.svg"),
		).toBe("/_assets/logo-a1.svg");
	});

	test("fails for files the build doesn't have", () => {
		expect(() =>
			createViteAssetFunction({
				kind: "build",
				buildId: "build",
				prefix: "site/",
				ui: null,
				manifest: {},
			})("images/logo.svg"),
		).toThrow(/isn't in the site's Vite build/);
	});
});
