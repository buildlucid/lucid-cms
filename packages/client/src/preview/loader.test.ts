// @vitest-environment happy-dom

import { afterEach, describe, expect, test, vi } from "vitest";
import { setupPreview } from "./loader.js";

const pageScriptKey = Symbol.for("lucid.preview-page");

/** Puts the page in the builder's preview frame, with the CMS's page script already loaded. */
const inPreviewFrame = () => {
	window.name = "lucid-builder-preview:scoped";
	Object.defineProperty(window, "top", { value: null, configurable: true });
	const runtime = { handlersChanged: vi.fn(), cleanup: vi.fn() };
	const setup = vi.fn(() => runtime);
	Reflect.set(window, pageScriptKey, { version: 1, setup });
	return { runtime, setup };
};

afterEach(() => {
	window.name = "";
	Reflect.deleteProperty(window, "top");
	Reflect.deleteProperty(window, pageScriptKey);
});

describe("setupPreview", () => {
	test("stays inactive outside the builder's preview frame", async () => {
		const preview = setupPreview();
		await preview.ready;

		expect(preview.active).toBe(false);
		expect(document.querySelector("script")).toBeNull();
	});

	test("starts the CMS's page script in the preview frame and hands it the page's handlers", async () => {
		const { runtime, setup } = inPreviewFrame();
		const preview = setupPreview({ morph: true });
		await preview.ready;

		expect(setupPreview()).toBe(preview);
		expect(setup).toHaveBeenCalledWith(
			expect.objectContaining({ morph: true }),
		);
		expect(preview.active).toBe(true);
		const remove = preview.onUpdate(() => undefined);
		remove();
		expect(runtime.handlersChanged).toHaveBeenCalledTimes(2);
		preview.cleanup();
		expect(runtime.cleanup).toHaveBeenCalledOnce();
		expect(preview.active).toBe(false);
	});
});
