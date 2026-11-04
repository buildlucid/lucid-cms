// @vitest-environment happy-dom

import { describe, expect, test } from "vitest";
import { setupPreviewPage } from "./runtime.js";

describe("preview page runtime", () => {
	test("does nothing outside the builder's preview frame", () => {
		window.name = "";
		expect(
			setupPreviewPage({
				handlers: new Set(),
				morph: true,
				serverMarkup: new WeakMap(),
			}),
		).toBeNull();
	});
});
