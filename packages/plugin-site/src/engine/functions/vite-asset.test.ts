import { describe, expect, test } from "vitest";
import createViteAssetFunction from "./vite-asset.js";

describe("viteAsset()", () => {
	test("returns the source URL in development and the built file's URL once built", () => {
		expect(
			createViteAssetFunction({ mode: "dev", directory: "/site", vite: true })(
				"./images/logo.svg",
			),
		).toBe("/_assets/images/logo.svg");
		expect(
			createViteAssetFunction({
				mode: "build",
				templates: {},
				manifest: { "images/logo.svg": { file: "logo-a1.svg" } },
			})("images/logo.svg"),
		).toBe("/_assets/logo-a1.svg");
	});

	test("fails for files the build doesn't have", () => {
		expect(() =>
			createViteAssetFunction({ mode: "build", templates: {}, manifest: null })(
				"images/logo.svg",
			),
		).toThrow(/isn't in the site's Vite build/);
	});
});
