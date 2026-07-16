// @vitest-environment happy-dom

import { afterEach, describe, expect, test } from "vitest";
import { setupPreviewRuntime } from "./runtime.js";

afterEach(() => {
	document.head
		.querySelectorAll("[data-lucid-preview-field-hint-styles]")
		.forEach((element) => {
			element.remove();
		});
});

describe("preview runtime targeting hints", () => {
	test("does not install hints in a normal frontend window", () => {
		window.name = "";
		const controller = setupPreviewRuntime("perspective");

		expect(controller.active).toBe(false);
		expect(
			document.querySelector("[data-lucid-preview-field-hint-styles]"),
		).toBeNull();
	});
});
